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
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingService } from '../../booking/booking.service';
import { PaymentService } from '../../payment/payment.service';
import { OfferingService } from '../../provider-offering/offering.service';
import { ServiceService } from '../../catalogue/service/service.service';
import { CustomerService } from '../../customer/customer.service';
import { REFUND_GATEWAY, RefundNotConfiguredException } from '../gateway/refund-gateway.interface';
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

export type RefundResponse = Omit<Refund, 'idempotencyKey' | 'manualResolvedBy'>;

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

  async process(bookingId: string): Promise<RefundResponse> {
    const booking = await this.bookingService.findByIdOrThrow(bookingId);
    const reason = this.resolveReason(booking);
    const grossPaidAmount = await this.paymentService.sumSucceededAmount(bookingId);
    if (grossPaidAmount === 0) {
      throw new ConflictException('Nothing was paid for this booking — no refund to process');
    }

    const offering = await this.offeringService.findOneActive(booking.offeringId);
    const service = await this.serviceService.findOne(offering.serviceId);
    const policy = await this.resolveApplicablePolicy(reason, {
      providerId: offering.providerId,
      serviceId: offering.serviceId,
      categoryId: service.categoryId,
      townVillageId: booking.townVillageId,
    });
    const refundAmount = Math.round(
      grossPaidAmount * (Number(policy.refundPercentage) / 100) * 100,
    ) / 100;
    const idempotencyKey = createHash('sha256')
      .update([bookingId, reason, policy.id, refundAmount.toFixed(2), booking.currency].join(':'))
      .digest('hex');

    // A booking-scoped lock prevents concurrent admin retries from both
    // submitting a refund. FAILED means the adapter proved no request was
    // submitted; UNKNOWN must be reconciled manually and is never retried.
    const claim = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${bookingId}`}))`;
      const existing = await tx.refund.findUnique({ where: { bookingId } });
      if (existing?.status === RefundStatus.PENDING &&
          existing.updatedAt.getTime() <= Date.now() - 5 * 60_000) {
        const unknown = await tx.refund.update({
          where: { id: existing.id },
          data: {
            status: RefundStatus.UNKNOWN,
            failureReason: 'No confirmed refund outcome within five minutes; manual reconciliation is required',
          },
        });
        return { refund: unknown, shouldInitiate: false };
      }
      if (existing && existing.status !== RefundStatus.FAILED) {
        throw new ConflictException(
          'Refund is already processed or has an uncertain outcome; reconcile it before retrying',
        );
      }
      const data = {
        reason,
        appliedPolicyId: policy.id,
        grossPaidAmount,
        refundAmount,
        currency: booking.currency,
        idempotencyKey,
        status: RefundStatus.PENDING,
        failureReason: null,
      };
      const refund = existing
        ? await tx.refund.update({ where: { id: existing.id }, data })
        : await tx.refund.create({ data: { bookingId, ...data } });
      return { refund, shouldInitiate: true };
    });
    if (!claim.shouldInitiate) return this.toResponse(claim.refund);
    const refund = claim.refund;

    try {
      const { refundReference } = await this.refundGateway.initiateRefund(
        bookingId,
        refundAmount,
        booking.currency,
        refund.idempotencyKey,
      );
      await this.prisma.refund.updateMany({
        where: { id: refund.id, status: RefundStatus.PENDING },
        data: {
          status: RefundStatus.REFUNDED,
          refundReference,
          refundedAt: new Date(),
          failureReason: null,
        },
      });
      const updated = await this.prisma.refund.findUnique({ where: { id: refund.id } });
      if (!updated) throw new NotFoundException('Refund disappeared after gateway response');
      return this.toResponse(updated);
    } catch (error) {
      const definitelyNotSubmitted = error instanceof RefundNotConfiguredException;
      await this.prisma.refund.updateMany({
        where: { id: refund.id, status: RefundStatus.PENDING },
        data: {
          status: definitelyNotSubmitted ? RefundStatus.FAILED : RefundStatus.UNKNOWN,
          failureReason: error instanceof Error
            ? error.message.slice(0, 300)
            : 'Refund outcome is unknown; manual reconciliation is required',
        },
      });
      const updated = await this.prisma.refund.findUnique({ where: { id: refund.id } });
      if (!updated) throw new NotFoundException('Refund disappeared during recovery');
      return this.toResponse(updated);
    }
  }

  async resolveManual(
    id: string,
    actorUserId: string,
    outcome: 'REFUNDED' | 'FAILED',
    note: string,
  ): Promise<RefundResponse> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.refund.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Refund not found');
      if (current.status !== RefundStatus.UNKNOWN) {
        throw new ConflictException('Only UNKNOWN refunds can be manually resolved');
      }
      const now = new Date();
      const updated = await tx.refund.update({
        where: { id },
        data: {
          status: outcome === 'REFUNDED' ? RefundStatus.REFUNDED : RefundStatus.FAILED,
          manualResolutionNote: note,
          manualResolvedBy: actorUserId,
          manualResolvedAt: now,
          ...(outcome === 'REFUNDED'
            ? { refundedAt: now, failureReason: null }
            : { refundedAt: null, failureReason: 'Refund manually confirmed as not completed' }),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId,
          httpMethod: 'POST',
          routePath: '/api/v1/refund/:id/resolve',
          entityId: id,
          statusCode: 200,
          ipAddress: null,
          outcome: 'SUCCESS',
        },
      });
      return this.toResponse(updated);
    });
    return updated;
  }

  async list(): Promise<RefundResponse[]> {
    const refunds = await this.prisma.refund.findMany({ orderBy: { createdAt: 'desc' } });
    return refunds.map((refund) => this.toResponse(refund));
  }

  async findOne(id: string): Promise<RefundResponse> {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return this.toResponse(refund);
  }

  async listAsCustomer(userId: string): Promise<RefundResponse[]> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const refunds = await this.prisma.refund.findMany({
      where: { booking: { customerId: customer.id } },
      orderBy: { createdAt: 'desc' },
    });
    return refunds.map((refund) => this.redactCustomerResolution(this.toResponse(refund)));
  }

  async findAsCustomer(userId: string, id: string): Promise<RefundResponse> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!refund || refund.booking.customerId !== customer.id) {
      throw new NotFoundException('Refund not found');
    }
    return this.redactCustomerResolution(this.toResponse(refund));
  }

  private toResponse(refund: Refund): RefundResponse {
    const { idempotencyKey, manualResolvedBy, ...response } = refund;
    void idempotencyKey;
    void manualResolvedBy;
    return response;
  }

  private redactCustomerResolution(refund: RefundResponse): RefundResponse {
    return {
      ...refund,
      manualResolutionNote: null,
      manualResolvedAt: null,
    };
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
