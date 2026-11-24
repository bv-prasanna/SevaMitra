import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  BookingParty, BookingStatus, CommissionScopeType, RefundReason, RefundStatus,
} from '@prisma/client';
import { RefundService } from './refund.service';
import { RefundNotConfiguredException } from '../gateway/refund-gateway.interface';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BookingService } from '../../booking/booking.service';
import type { PaymentService } from '../../payment/payment.service';
import type { OfferingService } from '../../provider-offering/offering.service';
import type { ServiceService } from '../../catalogue/service/service.service';
import type { CustomerService } from '../../customer/customer.service';

describe('RefundService', () => {
  let prisma: {
    refund: { update: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock };
    refundPolicy: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    $executeRaw: jest.Mock;
    refund: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let bookingService: { findByIdOrThrow: jest.Mock };
  let paymentService: { sumSucceededAmount: jest.Mock };
  let offeringService: { findOneActive: jest.Mock };
  let serviceService: { findOne: jest.Mock };
  let customerService: { getActiveProfileOrThrow: jest.Mock };
  let refundGateway: { initiateRefund: jest.Mock };
  let service: RefundService;

  const cancelledBooking = {
    id: 'booking-1', status: BookingStatus.CANCELLED,
    cancelledBy: BookingParty.CUSTOMER, noShowBy: null,
    offeringId: 'offering-1', townVillageId: 'town-1', currency: 'INR',
  };
  const offering = { id: 'offering-1', providerId: 'provider-1', serviceId: 'service-1' };
  const catalogueService = { id: 'service-1', categoryId: 'category-1' };
  const refund = {
    id: 'refund-1', bookingId: 'booking-1', idempotencyKey: 'a'.repeat(64),
    status: RefundStatus.PENDING, refundAmount: 250, currency: 'INR',
  };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn(),
      refund: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(refund),
        update: jest.fn().mockResolvedValue(refund),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    prisma = {
      refund: {
        update: jest.fn().mockResolvedValue({ ...refund, status: RefundStatus.REFUNDED }),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      refundPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    bookingService = { findByIdOrThrow: jest.fn().mockResolvedValue(cancelledBooking) };
    paymentService = { sumSucceededAmount: jest.fn().mockResolvedValue(500) };
    offeringService = { findOneActive: jest.fn().mockResolvedValue(offering) };
    serviceService = { findOne: jest.fn().mockResolvedValue(catalogueService) };
    customerService = { getActiveProfileOrThrow: jest.fn().mockResolvedValue({ id: 'customer-1' }) };
    refundGateway = {
      initiateRefund: jest.fn().mockResolvedValue({ refundReference: 'stub_refund_1' }),
    };
    service = new RefundService(
      prisma as unknown as PrismaService,
      bookingService as unknown as BookingService,
      paymentService as unknown as PaymentService,
      offeringService as unknown as OfferingService,
      serviceService as unknown as ServiceService,
      customerService as unknown as CustomerService,
      refundGateway as never,
    );
  });

  const platformPolicy = (percentage = 50) => {
    tx.refund.findUnique.mockResolvedValue(null);
    return percentage;
  };

  describe('reason and policy resolution', () => {
    it('resolves CUSTOMER_CANCELLED and uses the platform policy', async () => {
      const percentage = platformPolicy(50);
      const policy = { id: 'policy-1', refundPercentage: percentage };
      prisma.refundPolicy.findFirst
        .mockImplementation(({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM ? Promise.resolve(policy) : Promise.resolve(null));
      await service.process('booking-1');
      expect(tx.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ reason: RefundReason.CUSTOMER_CANCELLED, refundAmount: 250 }),
      });
    });

    it('resolves provider cancellation, provider no-show and booking rejection', async () => {
      const cases = [
        [{ ...cancelledBooking, cancelledBy: BookingParty.PROVIDER }, RefundReason.PROVIDER_CANCELLED],
        [{ ...cancelledBooking, status: BookingStatus.NO_SHOW, cancelledBy: null, noShowBy: BookingParty.PROVIDER }, RefundReason.PROVIDER_NO_SHOW],
        [{ ...cancelledBooking, status: BookingStatus.REJECTED, cancelledBy: null }, RefundReason.BOOKING_REJECTED],
      ] as const;
      for (const [booking, reason] of cases) {
        bookingService.findByIdOrThrow.mockResolvedValue(booking);
        prisma.refundPolicy.findFirst
          .mockImplementation(({ where }: { where: { scopeType: string } }) =>
            where.scopeType === CommissionScopeType.PLATFORM
              ? Promise.resolve({ id: 'policy-1', refundPercentage: 100 }) : Promise.resolve(null));
        tx.refund.findUnique.mockResolvedValue(null);
        tx.refund.create.mockResolvedValue(refund);
        await service.process('booking-1');
        expect(tx.refund.create).toHaveBeenLastCalledWith({
          data: expect.objectContaining({ reason }),
        });
      }
    });

    it('rejects non-terminal bookings and missing refund policies', async () => {
      bookingService.findByIdOrThrow.mockResolvedValue({ ...cancelledBooking, status: BookingStatus.ACCEPTED });
      await expect(service.process('booking-1')).rejects.toThrow(ConflictException);
      bookingService.findByIdOrThrow.mockResolvedValue(cancelledBooking);
      prisma.refundPolicy.findFirst
        .mockResolvedValue(null);
      await expect(service.process('booking-1')).rejects.toThrow(ConflictException);
      expect(tx.refund.create).not.toHaveBeenCalled();
    });
  });

  describe('idempotent process', () => {
    beforeEach(() => {
      (service as unknown as { prisma: { refundPolicy: { findFirst: jest.Mock } } }).prisma.refundPolicy.findFirst
        .mockImplementation(({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 50 }) : Promise.resolve(null));
    });

    it('claims a booking once and passes a stable idempotency key to the gateway', async () => {
      tx.refund.findUnique.mockResolvedValue(null);
      await service.process('booking-1');
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(refundGateway.initiateRefund).toHaveBeenCalledWith(
        'booking-1', 250, 'INR', expect.stringMatching(/^[a-f0-9]{64}$/),
      );
    });

    it('allows a retry only after a definitive FAILED outcome and reuses the same key', async () => {
      tx.refund.findUnique.mockResolvedValue({ ...refund, status: RefundStatus.FAILED });
      await service.process('booking-1');
      expect(tx.refund.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'refund-1' },
        data: expect.objectContaining({ status: RefundStatus.PENDING, failureReason: null }),
      }));
      expect(refundGateway.initiateRefund).toHaveBeenCalledWith(
        'booking-1', 250, 'INR', refund.idempotencyKey,
      );
    });

    it('rejects PENDING, REFUNDED and UNKNOWN refunds instead of submitting again', async () => {
      for (const status of [RefundStatus.PENDING, RefundStatus.REFUNDED, RefundStatus.UNKNOWN]) {
        tx.refund.findUnique.mockResolvedValue({ ...refund, status });
        await expect(service.process('booking-1')).rejects.toThrow(ConflictException);
      }
      expect(refundGateway.initiateRefund).not.toHaveBeenCalled();
    });

    it('marks a disabled gateway as FAILED because no request was submitted', async () => {
      refundGateway.initiateRefund.mockRejectedValue(new RefundNotConfiguredException());
      await service.process('booking-1');
      expect(prisma.refund.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: RefundStatus.FAILED }),
      }));
    });

    it('marks network timeouts UNKNOWN so a second automatic refund cannot be sent', async () => {
      refundGateway.initiateRefund.mockRejectedValue(new Error('network timeout'));
      await service.process('booking-1');
      expect(prisma.refund.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: RefundStatus.UNKNOWN }),
      }));
    });

    it('rejects when nothing was paid', async () => {
      paymentService.sumSucceededAmount.mockResolvedValue(0);
      await expect(service.process('booking-1')).rejects.toThrow(ConflictException);
      expect(tx.refund.create).not.toHaveBeenCalled();
    });
  });

  describe('manual resolution', () => {
    it('audits a manually confirmed refund', async () => {
      tx.refund.findUnique.mockResolvedValue({ ...refund, status: RefundStatus.UNKNOWN });
      tx.refund.update.mockResolvedValue({
        ...refund, status: RefundStatus.REFUNDED, manualResolutionNote: 'Bank record confirmed',
      });
      const result = await service.resolveManual('refund-1', 'admin-1', 'REFUNDED', 'Bank record confirmed');
      expect(result.status).toBe(RefundStatus.REFUNDED);
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorUserId: 'admin-1', entityId: 'refund-1' }),
      });
    });

    it('rejects manual resolution for a known refund state', async () => {
      tx.refund.findUnique.mockResolvedValue(refund);
      await expect(service.resolveManual('refund-1', 'admin-1', 'FAILED', 'Checked')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('customer access', () => {
    it('hides internal manual-resolution notes from customers', async () => {
      prisma.refund.findMany.mockResolvedValue([{
        ...refund, manualResolutionNote: 'internal only',
        manualResolvedBy: 'admin-1', manualResolvedAt: new Date(),
      }]);
      const result = await service.listAsCustomer('user-1');
      expect(result[0].manualResolutionNote).toBeNull();
      expect(result[0].manualResolvedBy).toBeNull();
    });

    it("throws NotFoundException for another customer's refund", async () => {
      prisma.refund.findUnique.mockResolvedValue({
        ...refund, booking: { customerId: 'someone-else' },
      });
      await expect(service.findAsCustomer('user-1', 'refund-1')).rejects.toThrow(NotFoundException);
    });
  });
});
