import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  BookingParty,
  BookingStatus,
  CommissionScopeType,
  RefundReason,
  RefundStatus,
} from '@prisma/client';
import { RefundService } from './refund.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BookingService } from '../../booking/booking.service';
import type { PaymentService } from '../../payment/payment.service';
import type { OfferingService } from '../../provider-offering/offering.service';
import type { ServiceService } from '../../catalogue/service/service.service';
import type { CustomerService } from '../../customer/customer.service';

describe('RefundService', () => {
  let prisma: {
    refund: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    refundPolicy: { findFirst: jest.Mock };
  };
  let bookingService: { findByIdOrThrow: jest.Mock };
  let paymentService: { sumSucceededAmount: jest.Mock };
  let offeringService: { findOneActive: jest.Mock };
  let serviceService: { findOne: jest.Mock };
  let customerService: { getActiveProfileOrThrow: jest.Mock };
  let refundGateway: { initiateRefund: jest.Mock };
  let service: RefundService;

  const cancelledBooking = {
    id: 'booking-1',
    status: BookingStatus.CANCELLED,
    cancelledBy: BookingParty.CUSTOMER,
    noShowBy: null,
    offeringId: 'offering-1',
    townVillageId: 'town-1',
    currency: 'INR',
  };
  const offering = {
    id: 'offering-1',
    providerId: 'provider-1',
    serviceId: 'service-1',
  };
  const catalogueService = { id: 'service-1', categoryId: 'category-1' };

  beforeEach(() => {
    prisma = {
      refund: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
      refundPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    bookingService = {
      findByIdOrThrow: jest.fn().mockResolvedValue(cancelledBooking),
    };
    paymentService = { sumSucceededAmount: jest.fn().mockResolvedValue(500) };
    offeringService = { findOneActive: jest.fn().mockResolvedValue(offering) };
    serviceService = { findOne: jest.fn().mockResolvedValue(catalogueService) };
    customerService = {
      getActiveProfileOrThrow: jest
        .fn()
        .mockResolvedValue({ id: 'customer-1' }),
    };
    refundGateway = {
      initiateRefund: jest
        .fn()
        .mockResolvedValue({ refundReference: 'stub_refund_1' }),
    };

    service = new RefundService(
      prisma as unknown as PrismaService,
      bookingService as unknown as BookingService,
      paymentService as unknown as PaymentService,
      offeringService as unknown as OfferingService,
      serviceService as unknown as ServiceService,
      customerService as unknown as CustomerService,
      refundGateway,
    );
  });

  describe('resolveReason via process()', () => {
    it('resolves CUSTOMER_CANCELLED', async () => {
      prisma.refundPolicy.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 50 })
            : Promise.resolve(null),
      );
      prisma.refund.create.mockResolvedValue({ id: 'refund-1' });
      prisma.refund.update.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.REFUNDED,
      });

      await service.process('booking-1');

      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: RefundReason.CUSTOMER_CANCELLED,
          refundAmount: 250,
        }),
      });
    });

    it('resolves PROVIDER_CANCELLED', async () => {
      bookingService.findByIdOrThrow.mockResolvedValue({
        ...cancelledBooking,
        cancelledBy: BookingParty.PROVIDER,
      });
      prisma.refundPolicy.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 100 })
            : Promise.resolve(null),
      );
      prisma.refund.create.mockResolvedValue({ id: 'refund-1' });
      prisma.refund.update.mockResolvedValue({ id: 'refund-1' });

      await service.process('booking-1');

      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: RefundReason.PROVIDER_CANCELLED,
        }),
      });
    });

    it('resolves CUSTOMER_NO_SHOW and PROVIDER_NO_SHOW', async () => {
      bookingService.findByIdOrThrow.mockResolvedValue({
        ...cancelledBooking,
        status: BookingStatus.NO_SHOW,
        cancelledBy: null,
        noShowBy: BookingParty.PROVIDER,
      });
      prisma.refundPolicy.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 100 })
            : Promise.resolve(null),
      );
      prisma.refund.create.mockResolvedValue({ id: 'refund-1' });
      prisma.refund.update.mockResolvedValue({ id: 'refund-1' });

      await service.process('booking-1');

      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: RefundReason.PROVIDER_NO_SHOW,
        }),
      });
    });

    it('resolves BOOKING_REJECTED', async () => {
      bookingService.findByIdOrThrow.mockResolvedValue({
        ...cancelledBooking,
        status: BookingStatus.REJECTED,
        cancelledBy: null,
      });
      prisma.refundPolicy.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 100 })
            : Promise.resolve(null),
      );
      prisma.refund.create.mockResolvedValue({ id: 'refund-1' });
      prisma.refund.update.mockResolvedValue({ id: 'refund-1' });

      await service.process('booking-1');

      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: RefundReason.BOOKING_REJECTED,
        }),
      });
    });

    it('rejects a booking that is not in a refund-eligible status', async () => {
      bookingService.findByIdOrThrow.mockResolvedValue({
        ...cancelledBooking,
        status: BookingStatus.ACCEPTED,
      });

      await expect(service.process('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });
  });

  describe('process', () => {
    it('rejects when nothing was paid', async () => {
      paymentService.sumSucceededAmount.mockResolvedValue(0);

      await expect(service.process('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('rejects when a refund is already REFUNDED for this booking', async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.REFUNDED,
      });

      await expect(service.process('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('throws when no policy applies, not even a PLATFORM default', async () => {
      prisma.refundPolicy.findFirst.mockResolvedValue(null);

      await expect(service.process('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('retries in place (update, not create) when an existing refund is FAILED', async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.FAILED,
      });
      prisma.refundPolicy.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 50 })
            : Promise.resolve(null),
      );
      prisma.refund.update
        .mockResolvedValueOnce({ id: 'refund-1', status: RefundStatus.PENDING })
        .mockResolvedValueOnce({
          id: 'refund-1',
          status: RefundStatus.REFUNDED,
        });

      await service.process('booking-1');

      expect(prisma.refund.create).not.toHaveBeenCalled();
      expect(prisma.refund.update).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        data: expect.objectContaining({
          status: RefundStatus.PENDING,
          failureReason: null,
        }),
      });
    });

    it('marks FAILED with a reason when the gateway throws', async () => {
      refundGateway.initiateRefund.mockRejectedValue(
        new Error('refund rail down'),
      );
      prisma.refundPolicy.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({ id: 'policy-1', refundPercentage: 50 })
            : Promise.resolve(null),
      );
      prisma.refund.create.mockResolvedValue({ id: 'refund-1' });
      prisma.refund.update.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.FAILED,
      });

      await service.process('booking-1');

      expect(prisma.refund.update).toHaveBeenCalledWith({
        where: { id: 'refund-1' },
        data: {
          status: RefundStatus.FAILED,
          failureReason: 'refund rail down',
        },
      });
    });
  });

  describe('findAsCustomer', () => {
    it("throws NotFoundException for another customer's refund", async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        booking: { customerId: 'someone-else' },
      });

      await expect(
        service.findAsCustomer('user-1', 'refund-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
