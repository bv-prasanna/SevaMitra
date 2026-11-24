import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentWebhookEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';

type StoredPayment = {
  id: string | null;
  orderId: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
};
type StoredPayload = { eventType: string; payment?: StoredPayment };

@Injectable()
export class RazorpayWebhookService {
  private readonly provider = 'RAZORPAY';
  private readonly maxAttempts = 8;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {}

  async receive(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    eventId: string | undefined,
  ): Promise<{ accepted: true; duplicate: boolean; status: string }> {
    if (!rawBody || rawBody.length === 0 || rawBody.length > 1024 * 1024) {
      throw new BadRequestException('Webhook body is missing or too large');
    }
    if (!eventId || !/^[A-Za-z0-9_-]{8,200}$/.test(eventId)) {
      throw new BadRequestException('A valid Razorpay event id is required');
    }
    this.verifySignature(rawBody, signature);

    let input: unknown;
    try {
      input = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Webhook body must be valid JSON');
    }
    if (!this.isRecord(input) || typeof input.event !== 'string' ||
        input.event.length < 1 || input.event.length > 120) {
      throw new BadRequestException('Razorpay event type is missing');
    }
    const payload = this.normalizePayload(input.event, input.payload);
    let event;
    let duplicate = false;
    try {
      event = await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: this.provider,
          eventId,
          eventType: input.event,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: PaymentWebhookEventStatus.RECEIVED,
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
      duplicate = true;
      event = await this.prisma.paymentWebhookEvent.findUnique({
        where: { provider_eventId: { provider: this.provider, eventId } },
      });
      if (!event) throw new ServiceUnavailableException('Webhook event could not be loaded');
      if ([PaymentWebhookEventStatus.PROCESSED, PaymentWebhookEventStatus.DEAD].includes(event.status)) {
        return { accepted: true, duplicate: true, status: event.status };
      }
    }

    const result = await this.processOne(event.id);
    return { accepted: true, duplicate, status: result };
  }

  /** Replays due inbox rows; permanent failures remain in DEAD for review. */
  async retryDueEvents(limit = 50): Promise<{
    checked: number; processed: number; retryable: number; dead: number;
  }> {
    const now = new Date();
    const due = await this.prisma.paymentWebhookEvent.findMany({
      where: {
        OR: [
          { status: PaymentWebhookEventStatus.RECEIVED },
          { status: PaymentWebhookEventStatus.RETRYABLE, nextAttemptAt: { lte: now } },
          { status: PaymentWebhookEventStatus.PROCESSING, leaseUntil: { lt: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    const summary = { checked: 0, processed: 0, retryable: 0, dead: 0 };
    for (const row of due) {
      summary.checked++;
      try {
        const status = await this.processOne(row.id);
        if (status === PaymentWebhookEventStatus.PROCESSED) summary.processed++;
        else if (status === PaymentWebhookEventStatus.DEAD) summary.dead++;
        else summary.retryable++;
      } catch {
        summary.retryable++;
      }
    }
    return summary;
  }

  private async processOne(id: string): Promise<PaymentWebhookEventStatus> {
    const now = new Date();
    const claim = await this.prisma.paymentWebhookEvent.updateMany({
      where: {
        id,
        OR: [
          { status: PaymentWebhookEventStatus.RECEIVED },
          { status: PaymentWebhookEventStatus.RETRYABLE, nextAttemptAt: { lte: now } },
          { status: PaymentWebhookEventStatus.PROCESSING, leaseUntil: { lt: now } },
        ],
      },
      data: {
        status: PaymentWebhookEventStatus.PROCESSING,
        attempts: { increment: 1 },
        lastAttemptAt: now,
        leaseUntil: new Date(now.getTime() + 60_000),
        nextAttemptAt: null,
      },
    });
    if (claim.count !== 1) {
      const current = await this.prisma.paymentWebhookEvent.findUnique({ where: { id } });
      return current?.status ?? PaymentWebhookEventStatus.RETRYABLE;
    }

    const event = await this.prisma.paymentWebhookEvent.findUnique({ where: { id } });
    if (!event) throw new ServiceUnavailableException('Claimed webhook event disappeared');
    const payload = event.payload as unknown as StoredPayload;
    try {
      if (event.eventType === 'payment.captured' || event.eventType === 'order.paid') {
        const payment = payload.payment;
        if (!payment?.id || !/^pay_[A-Za-z0-9_-]{3,100}$/.test(payment.id) ||
            !payment.orderId || !/^order_[A-Za-z0-9_-]{3,100}$/.test(payment.orderId) ||
            !Number.isSafeInteger(payment.amount) || !payment.currency ||
            payment.status !== 'captured') {
          throw new BadRequestException('Captured payment event is incomplete or not captured');
        }
        await this.paymentService.confirmCapturedFromGateway(
          payment.orderId, payment.id, payment.amount as number, payment.currency,
        );
      }
      // payment.failed is intentionally recorded without failing the order
      // intent: Razorpay may allow another attempt against the same order.
      await this.prisma.paymentWebhookEvent.update({
        where: { id },
        data: {
          status: PaymentWebhookEventStatus.PROCESSED,
          processedAt: new Date(),
          leaseUntil: null,
          nextAttemptAt: null,
          lastError: null,
        },
      });
      return PaymentWebhookEventStatus.PROCESSED;
    } catch (error) {
      const permanent = error instanceof BadRequestException ||
        error instanceof ConflictException;
      const attempts = event.attempts;
      const dead = permanent || attempts >= this.maxAttempts;
      const delayMs = Math.min(60 * 60_000, 30_000 * (2 ** Math.min(attempts - 1, 7)));
      await this.prisma.paymentWebhookEvent.update({
        where: { id },
        data: {
          status: dead ? PaymentWebhookEventStatus.DEAD : PaymentWebhookEventStatus.RETRYABLE,
          leaseUntil: null,
          nextAttemptAt: dead ? null : new Date(Date.now() + delayMs),
          lastError: error instanceof Error ? error.message.slice(0, 300) : 'Unknown webhook processing failure',
        },
      });
      if (dead) return PaymentWebhookEventStatus.DEAD;
      throw new ServiceUnavailableException('Webhook event is queued for safe retry');
    }
  }

  private normalizePayload(eventType: string, raw: unknown): StoredPayload {
    const root = this.isRecord(raw) ? raw : {};
    const paymentContainer = this.isRecord(root.payment) ? root.payment : {};
    const entity = this.isRecord(paymentContainer.entity) ? paymentContainer.entity : {};
    const id = typeof entity.id === 'string' ? entity.id : null;
    const orderId = typeof entity.order_id === 'string' ? entity.order_id : null;
    const amount = typeof entity.amount === 'number' && Number.isSafeInteger(entity.amount)
      ? entity.amount : null;
    const currency = typeof entity.currency === 'string' ? entity.currency : null;
    const status = typeof entity.status === 'string' ? entity.status : null;
    return {
      eventType,
      ...(eventType === 'payment.captured' || eventType === 'order.paid'
        ? { payment: { id, orderId, amount, currency, status } }
        : {}),
    };
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Razorpay webhook verification is not configured');
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const supplied = Buffer.from(signature, 'hex');
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
