import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingParty,
  BookingStatus,
  CommissionScopeType,
  Refund,
  RefundReason,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingService } from '../../booking/booking.service';
import { PaymentService } from '../../payment/payment.service';
import { OfferingService } from '../../provider-offering/offering.service';
import { ServiceService } from '../../catalogue/service/service.service';
import { CustomerService } from '../../customer/customer.service';
import { REFUND_GATEWAY } from '../gateway/refund-gateway.interface';
import type { RefundGateway } from '../gateway/refund-gateway.interface';

interface ResolvedScope {
  providerId: string;
  serviceId: string;
  categoryId: string;
  townVillageId: string;
}

const PRECEDENCE: {
  scopeType: CommissionScopeType;
  field: keyof ResolvedScope | null;
}[] = [
  { scopeType: CommissionScopeType.PROVIDER, field: 'providerId' },
  { scopeType: CommissionScopeType.SERVICE, field: 'serviceId' },
  { scopeType: CommissionScopeType.CATEGORY, field: 'categoryId' },
  { scopeType: CommissionScopeType.GEOGRAPHY, field: 'townVillageId' },
  { scopeType: CommissionScopeType.PLATFORM, field: null },
];

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    private readonly offeringService: OfferingService,
    private readonly serviceService: ServiceService,
    private readonly customerService: CustomerService,
    @Inject(REFUND_GATEWAY) private readonly refundGateway: RefundGateway,
  ) {}

  async process(bookingId: string): Promise<Refund> {
    const booking = await this.bookingService.findByIdOrThrow(bookingId);
    const reason = this.resolveReason(booking);

    const existing = await this.prisma.refund.findUnique({
      where: { bookingId },
    });
    if (existing && existing.status !== RefundStatus.FAILED) {
      throw new ConflictException(
        'Refund has already been processed or is in progress for this booking',
      );
    }

    const grossPaidAmount =
      await this.paymentService.sumSucceededAmount(bookingId);
    if (grossPaidAmount === 0) {
      throw new ConflictException(
        'Nothing was paid for this booking — no refund to process',
      );
    }

    const offering = await this.offeringService.findOneActive(
      booking.offeringId,
    );
    const service = await this.serviceService.findOne(offering.serviceId);

    const policy = await this.resolveApplicablePolicy(reason, {
      providerId: offering.providerId,
      serviceId: offering.serviceId,
      categoryId: service.categoryId,
      townVillageId: booking.townVillageId,
    });

    const refundAmount =
      Math.round(
        grossPaidAmount * (Number(policy.refundPercentage) / 100) * 100,
      ) / 100;

    const refund = existing
      ? await this.prisma.refund.update({
          where: { bookingId },
          data: {
            reason,
            appliedPolicyId: policy.id,
            grossPaidAmount,
            refundAmount,
            currency: booking.currency,
            status: RefundStatus.PENDING,
            failureReason: null,
          },
        })
      : await this.prisma.refund.create({
          data: {
            bookingId,
            reason,
            appliedPolicyId: policy.id,
            grossPaidAmount,
            refundAmount,
            currency: booking.currency,
            status: RefundStatus.PENDING,
          },
        });

    try {
      const { refundReference } = await this.refundGateway.initiateRefund(
        bookingId,
        refundAmount,
        booking.currency,
      );
      return this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.REFUNDED,
          refundReference,
          refundedAt: new Date(),
        },
      });
    } catch (err) {
      return this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          status: RefundStatus.FAILED,
          failureReason:
            err instanceof Error ? err.message : 'Unknown refund failure',
        },
      });
    }
  }

  list(): Promise<Refund[]> {
    return this.prisma.refund.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  async listAsCustomer(userId: string): Promise<Refund[]> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    return this.prisma.refund.findMany({
      where: { booking: { customerId: customer.id } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAsCustomer(userId: string, id: string): Promise<Refund> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!refund || refund.booking.customerId !== customer.id) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  /**
   * Maps a terminal Booking outcome to the one RefundReason it can ever
   * correspond to. A Booking that is REQUESTED, ACCEPTED, or COMPLETED is
   * not refund-eligible — COMPLETED in particular is deliberately absent:
   * Commission only calculates for COMPLETED bookings, so a booking is
   * structurally either commissioned or (potentially) refunded, never
   * both. See docs/modules/REFUND_IMPLEMENTATION.md §1.
   */
  private resolveReason(booking: Booking): RefundReason {
    if (booking.status === BookingStatus.REJECTED) {
      return RefundReason.BOOKING_REJECTED;
    }
    if (booking.status === BookingStatus.CANCELLED) {
      return booking.cancelledBy === BookingParty.CUSTOMER
        ? RefundReason.CUSTOMER_CANCELLED
        : RefundReason.PROVIDER_CANCELLED;
    }
    if (booking.status === BookingStatus.NO_SHOW) {
      return booking.noShowBy === BookingParty.CUSTOMER
        ? RefundReason.CUSTOMER_NO_SHOW
        : RefundReason.PROVIDER_NO_SHOW;
    }
    throw new ConflictException(
      `Booking is not eligible for a refund from its current status (${booking.status})`,
    );
  }

  /** Same fixed precedence as Commission, additionally filtered by reason — see docs/modules/COMMISSION_IMPLEMENTATION.md §4.1. */
  private async resolveApplicablePolicy(
    reason: RefundReason,
    scope: ResolvedScope,
  ) {
    for (const { scopeType, field } of PRECEDENCE) {
      const policy = await this.prisma.refundPolicy.findFirst({
        where: {
          scopeType,
          reason,
          isActive: true,
          ...(field ? { [field]: scope[field] } : {}),
        },
      });
      if (policy) {
        return policy;
      }
    }
    throw new ConflictException(
      `No refund policy applies for ${reason} and no PLATFORM default is configured`,
    );
  }
}
