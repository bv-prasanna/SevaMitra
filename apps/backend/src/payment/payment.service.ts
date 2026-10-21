import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Booking,
  BookingStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
import { CustomerService } from '../customer/customer.service';
import { ProviderService } from '../provider/provider.service';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';
import type { PaymentGateway } from './gateway/payment-gateway.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

const NON_PAYABLE_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
];

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
    private readonly customerService: CustomerService,
    private readonly providerService: ProviderService,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
    private readonly config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------
  // Customer-facing
  // ---------------------------------------------------------------------

  async initiateAsCustomer(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    this.assertCollectionsAllowed();
    const booking = await this.bookingService.findAsCustomer(userId, dto.bookingId);

    // Reserve the outstanding amount atomically before contacting the gateway.
    // External HTTP calls must not hold an open database transaction.
    const reserve = () => this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(
        hashtext('payment-intent'), hashtext(${booking.id})
      )::text AS locked`;

      if (dto.clientRequestId) {
        const previous = await tx.payment.findFirst({
          where: { bookingId: booking.id, clientRequestId: dto.clientRequestId },
        });
        if (previous) {
          if (previous.method !== dto.method || Number(previous.amount) !== dto.amount) {
            throw new ConflictException('Idempotency key was used for a different payment');
          }
          return { payment: previous, existing: true };
        }
      }

      // A cancellation can race with checkout; never rely on an earlier read.
      const current = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!current || NON_PAYABLE_STATUSES.includes(current.status)) {
        throw new ConflictException('Booking is no longer payable');
      }
      await this.assertWithinOutstandingBalance(tx, current, dto.amount);
      const payment = await tx.payment.create({
        data: {
          bookingId: current.id,
          method: dto.method,
          amount: dto.amount,
          currency: current.currency,
          clientRequestId: dto.clientRequestId,
        },
      });
      return { payment, existing: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    let result: Awaited<ReturnType<typeof reserve>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await reserve();
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034' && attempt < 2) continue;
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === 'P2034' || error.code === 'P2002')) {
          throw new ConflictException('Concurrent payment request; retry using the same clientRequestId');
        }
        throw error;
      }
    }
    if (!result) throw new ConflictException('Could not reserve payment safely');
    const { payment, existing } = result;
    if (existing) {
      if (payment.method === PaymentMethod.ONLINE &&
          payment.status === PaymentStatus.INITIATED && !payment.gatewayOrderId) {
        throw new ConflictException('Payment order is being prepared; retry with the same clientRequestId');
      }
      return payment;
    }
    if (dto.method !== PaymentMethod.ONLINE) return payment;

    // An unconfirmed payment is not proof of collection. If creation fails,
    // release the reservation and let the caller retry with a fresh key.
    try {
      const { gatewayOrderId } = await this.paymentGateway.createOrder(
        dto.amount, booking.currency, payment.id,
      );
      return await this.prisma.payment.update({
        where: { id: payment.id, status: PaymentStatus.INITIATED, AND: [{ gatewayOrderId: null }] },
        data: { gatewayOrderId },
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id, status: PaymentStatus.INITIATED, AND: [{ gatewayOrderId: null }] },
        data: { status: PaymentStatus.FAILED, failureReason: 'Gateway order initialization failed' },
      }).catch(() => undefined);
      throw error;
    }
  }

  async listAsCustomer(
    userId: string,
    status?: PaymentStatus,
    bookingId?: string,
  ): Promise<Payment[]> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    return this.prisma.payment.findMany({
      where: { booking: { customerId: customer.id }, status, bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAsCustomer(userId: string, id: string): Promise<Payment> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    return this.getOwnedByCustomerOrThrow(customer.id, id);
  }

  async verifyAsCustomer(
    userId: string,
    id: string,
    dto: VerifyPaymentDto,
  ): Promise<Payment> {
    this.assertCollectionsAllowed();
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const payment = await this.getOwnedByCustomerOrThrow(customer.id, id);

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new ConflictException('Only ONLINE payments require verification');
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      throw new ConflictException(
        `Payment cannot be verified from its current status (${payment.status})`,
      );
    }

    const verified = await this.paymentGateway.verifyPayment(
      payment.gatewayOrderId!,
      dto.gatewayPaymentId,
      dto.gatewaySignature,
      Number(payment.amount),
      payment.currency,
    );

    // An attacker can submit a forged callback. Invalid signatures must not
    // change an otherwise valid order to FAILED (payment-confirmation DoS).
    if (!verified) {
      throw new ConflictException('Gateway verification failed; payment remains pending reconciliation');
    }
    return this.prisma.payment.update({
      where: { id: payment.id, status: PaymentStatus.INITIATED },
      data: {
        status: PaymentStatus.SUCCEEDED,
        gatewayPaymentId: dto.gatewayPaymentId,
        settledAt: new Date(),
      },
    });
  }

  // ---------------------------------------------------------------------
  // Provider-facing
  // ---------------------------------------------------------------------

  async listAsProvider(
    userId: string,
    status?: PaymentStatus,
    bookingId?: string,
  ): Promise<Payment[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.payment.findMany({
      where: {
        booking: { offering: { providerId: provider.id } },
        status,
        bookingId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAsProvider(userId: string, id: string): Promise<Payment> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.getOwnedByProviderOrThrow(provider.id, id);
  }

  async markCashCollectedAsProvider(
    userId: string,
    id: string,
  ): Promise<Payment> {
    this.assertCollectionsAllowed();
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const payment = await this.getOwnedByProviderOrThrow(provider.id, id);

    if (payment.method !== PaymentMethod.CASH) {
      throw new ConflictException('Only CASH payments can be marked collected');
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      throw new ConflictException(
        `Payment cannot be marked collected from its current status (${payment.status})`,
      );
    }

    return this.prisma.payment.update({
      where: { id: payment.id, status: PaymentStatus.INITIATED },
      data: { status: PaymentStatus.SUCCEEDED, settledAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------
  // Admin / system (no ownership check — for cross-cutting modules like
  // Commission that need a booking's actually-collected total regardless
  // of which party made the payments)
  // ---------------------------------------------------------------------

  async sumSucceededAmount(bookingId: string): Promise<number> {
    const succeeded = await this.prisma.payment.findMany({
      where: { bookingId, status: PaymentStatus.SUCCEEDED },
    });
    return succeeded.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  // ---------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------

  /** Blocks cash AND online collection for a non-financial staging/puja pilot. */
  private assertCollectionsAllowed(): void {
    if (this.config.get<string>('PILOT_DISABLE_COLLECTIONS') === 'true') {
      throw new ConflictException('Payment collection is disabled in this pilot');
    }
  }


  /**
   * Skips the check entirely when the booking has no fixed price yet
   * (both `amount` and `visitFee` null — an unresolved QUOTE_BASED
   * booking). There is nothing to validate against until a Quote module
   * exists to set a price — see docs/modules/PAYMENT_IMPLEMENTATION.md §1.
   */
  private async assertWithinOutstandingBalance(
    tx: Prisma.TransactionClient,
    booking: Booking,
    newAmount: number,
  ): Promise<void> {
    const totalDue =
      Number(booking.amount ?? 0) + Number(booking.visitFee ?? 0);
    if (totalDue === 0) {
      // Never charge an arbitrary amount against an unapproved quote.
      throw new ConflictException('A finalized quote or fixed amount is required before payment');
    }

    const existing = await tx.payment.findMany({
      where: {
        bookingId: booking.id,
        status: { in: [PaymentStatus.INITIATED, PaymentStatus.SUCCEEDED] },
      },
    });
    const alreadyCommitted = existing.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    if (alreadyCommitted + newAmount > totalDue) {
      throw new ConflictException(
        "Payment amount exceeds the booking's outstanding balance",
      );
    }
  }

  private async getOwnedByCustomerOrThrow(
    customerId: string,
    id: string,
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!payment || payment.booking.customerId !== customerId) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  private async getOwnedByProviderOrThrow(
    providerId: string,
    id: string,
  ): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: { include: { offering: true } } },
    });
    if (!payment || payment.booking.offering.providerId !== providerId) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
