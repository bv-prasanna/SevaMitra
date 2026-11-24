import { createHmac } from 'node:crypto';
import {
  ConflictException, NotFoundException, ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentWebhookEventStatus } from '@prisma/client';
import { RazorpayWebhookService } from './razorpay-webhook.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PaymentService } from './payment.service';
import type { ConfigService } from '@nestjs/config';

describe('RazorpayWebhookService', () => {
  const secret = 'test-webhook-secret-with-sufficient-entropy';
  const payload = {
    event: 'payment.captured',
    payload: { payment: { entity: {
      id: 'pay_12345', order_id: 'order_12345',
      amount: 30000, currency: 'INR', status: 'captured',
      email: 'must-not-be-persisted@example.test',
    } } },
  };
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(raw).digest('hex');
  let prisma: {
    paymentWebhookEvent: {
      create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock;
      update: jest.Mock; findMany: jest.Mock;
    };
  };
  let payments: { confirmCapturedFromGateway: jest.Mock };
  let config: { get: jest.Mock };
  let service: RazorpayWebhookService;

  const stored = {
    id: 'event-row-1',
    eventId: 'evt_12345678',
    eventType: 'payment.captured',
    status: PaymentWebhookEventStatus.RECEIVED,
    attempts: 1,
    payload: {
      eventType: 'payment.captured',
      payment: { id: 'pay_12345', orderId: 'order_12345',
        amount: 30000, currency: 'INR', status: 'captured' },
    },
  };

  beforeEach(() => {
    prisma = { paymentWebhookEvent: {
      create: jest.fn().mockResolvedValue(stored),
      findUnique: jest.fn().mockResolvedValue(stored),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    } };
    payments = { confirmCapturedFromGateway: jest.fn().mockResolvedValue({ id: 'payment-1' }) };
    config = { get: jest.fn().mockReturnValue(secret) };
    service = new RazorpayWebhookService(
      prisma as unknown as PrismaService,
      payments as unknown as PaymentService,
      config as unknown as ConfigService,
    );
  });

  it('rejects forged signatures before storing any event', async () => {
    await expect(service.receive(raw, '0'.repeat(64), 'evt_12345678'))
      .rejects.toThrow(UnauthorizedException);
    expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('requires a stable gateway event id', async () => {
    await expect(service.receive(raw, signature, 'bad id')).rejects.toThrow();
    expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('stores only a sanitized payload and applies a captured payment', async () => {
    await expect(service.receive(raw, signature, 'evt_12345678')).resolves.toEqual({
      accepted: true, duplicate: false, status: PaymentWebhookEventStatus.PROCESSED,
    });
    expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'RAZORPAY',
        eventId: 'evt_12345678',
        eventType: 'payment.captured',
        payload: {
          eventType: 'payment.captured',
          payment: { id: 'pay_12345', orderId: 'order_12345',
            amount: 30000, currency: 'INR', status: 'captured' },
        },
      }),
    });
    expect(JSON.stringify(prisma.paymentWebhookEvent.create.mock.calls[0][0]))
      .not.toContain('must-not-be-persisted');
    expect(payments.confirmCapturedFromGateway)
      .toHaveBeenCalledWith('order_12345', 'pay_12345', 30000, 'INR');
    expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-row-1' },
      data: expect.objectContaining({ status: PaymentWebhookEventStatus.PROCESSED }),
    });
  });

  it('does not process an already completed duplicate event', async () => {
    prisma.paymentWebhookEvent.create.mockRejectedValue({ code: 'P2002' });
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      ...stored, status: PaymentWebhookEventStatus.PROCESSED,
    });

    await expect(service.receive(raw, signature, 'evt_12345678')).resolves.toEqual({
      accepted: true, duplicate: true, status: PaymentWebhookEventStatus.PROCESSED,
    });
    expect(prisma.paymentWebhookEvent.updateMany).not.toHaveBeenCalled();
    expect(payments.confirmCapturedFromGateway).not.toHaveBeenCalled();
  });

  it('retries a duplicate event previously queued for retry', async () => {
    prisma.paymentWebhookEvent.create.mockRejectedValue({ code: 'P2002' });
    prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
      ...stored, status: PaymentWebhookEventStatus.RETRYABLE,
    });

    await service.receive(raw, signature, 'evt_12345678');

    expect(prisma.paymentWebhookEvent.updateMany).toHaveBeenCalled();
    expect(payments.confirmCapturedFromGateway).toHaveBeenCalled();
  });

  it('queues unknown payment orders for retry rather than losing a captured payment', async () => {
    payments.confirmCapturedFromGateway.mockRejectedValue(new NotFoundException());
    await expect(service.receive(raw, signature, 'evt_12345678'))
      .rejects.toThrow(ServiceUnavailableException);
    expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-row-1' },
      data: expect.objectContaining({ status: PaymentWebhookEventStatus.RETRYABLE }),
    });
  });

  it('moves a mismatched capture to the dead-letter state for review', async () => {
    payments.confirmCapturedFromGateway.mockRejectedValue(new ConflictException('amount mismatch'));
    await expect(service.receive(raw, signature, 'evt_12345678')).resolves.toEqual({
      accepted: true, duplicate: false, status: PaymentWebhookEventStatus.DEAD,
    });
    expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-row-1' },
      data: expect.objectContaining({ status: PaymentWebhookEventStatus.DEAD }),
    });
  });

  it('records failed attempts without marking the payment intent failed', async () => {
    const failed = Buffer.from(JSON.stringify({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_12345', order_id: 'order_12345',
        amount: 30000, currency: 'INR', status: 'failed' } } },
    }));
    const failedSignature = createHmac('sha256', secret).update(failed).digest('hex');

    await service.receive(failed, failedSignature, 'evt_failed_123456');

    expect(payments.confirmCapturedFromGateway).not.toHaveBeenCalled();
    expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PaymentWebhookEventStatus.PROCESSED }),
    }));
  });

  it('fails closed when the webhook secret is absent', async () => {
    config.get.mockReturnValue(undefined);
    await expect(service.receive(raw, signature, 'evt_12345678'))
      .rejects.toThrow(ServiceUnavailableException);
    expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
  });
});
