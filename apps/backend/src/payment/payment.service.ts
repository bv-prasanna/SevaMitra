import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

  // ---------------------------------------------------------------------
  // Customer-facing
  // ---------------------------------------------------------------------

  async initiateAsCustomer(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    const booking = await this.bookingService.findAsCustomer(
      userId,
      dto.bookingId,
    );

    if (NON_PAYABLE_STATUSES.includes(booking.status)) {
      throw new ConflictException(
        `Booking cannot accept payment from its current status (${booking.status})`,
      );
    }

    await this.assertWithinOutstandingBalance(booking, dto.amount);

    if (dto.method === PaymentMethod.ONLINE) {
      const { gatewayOrderId } = await this.paymentGateway.createOrder(
        dto.amount,
        booking.currency,
        booking.id,
      );
      return this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          method: dto.method,
          amount: dto.amount,
          currency: booking.currency,
          gatewayOrderId,
        },
      });
    }

    return this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        method: dto.method,
        amount: dto.amount,
        currency: booking.currency,
      },
    });
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

    return this.prisma.payment.update({
      where: { id: payment.id, status: PaymentStatus.INITIATED },
      data: verified
        ? {
            status: PaymentStatus.SUCCEEDED,
            gatewayPaymentId: dto.gatewayPaymentId,
            settledAt: new Date(),
          }
        : {
            status: PaymentStatus.FAILED,
            gatewayPaymentId: dto.gatewayPaymentId,
            failureReason: 'Gateway signature verification failed',
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

  /**
   * Skips the check entirely when the booking has no fixed price yet
   * (both `amount` and `visitFee` null — an unresolved QUOTE_BASED
   * booking). There is nothing to validate against until a Quote module
   * exists to set a price — see docs/modules/PAYMENT_IMPLEMENTATION.md §1.
   */
  private async assertWithinOutstandingBalance(
    booking: Booking,
    newAmount: number,
  ): Promise<void> {
    const totalDue =
      Number(booking.amount ?? 0) + Number(booking.visitFee ?? 0);
    if (totalDue === 0) {
      return;
    }

    const existing = await this.prisma.payment.findMany({
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
