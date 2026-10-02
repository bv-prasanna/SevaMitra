import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  BookingStatus,
  CommissionScopeType,
  CommissionType,
} from '@prisma/client';
import { CommissionCalculationService } from './commission-calculation.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BookingService } from '../../booking/booking.service';
import type { PaymentService } from '../../payment/payment.service';
import type { OfferingService } from '../../provider-offering/offering.service';
import type { ServiceService } from '../../catalogue/service/service.service';
import type { ProviderService } from '../../provider/provider.service';

describe('CommissionCalculationService', () => {
  let prisma: {
    commissionCalculation: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    commissionRule: { findFirst: jest.Mock };
  };
  let bookingService: { findByIdOrThrow: jest.Mock };
  let paymentService: { sumSucceededAmount: jest.Mock };
  let offeringService: { findOneActive: jest.Mock };
  let serviceService: { findOne: jest.Mock };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let service: CommissionCalculationService;

  const completedBooking = {
    id: 'booking-1',
    status: BookingStatus.COMPLETED,
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
      commissionCalculation: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
      commissionRule: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    bookingService = {
      findByIdOrThrow: jest.fn().mockResolvedValue(completedBooking),
    };
    paymentService = { sumSucceededAmount: jest.fn().mockResolvedValue(599) };
    offeringService = { findOneActive: jest.fn().mockResolvedValue(offering) };
    serviceService = { findOne: jest.fn().mockResolvedValue(catalogueService) };
    providerService = {
      getActiveProfileOrThrow: jest
        .fn()
        .mockResolvedValue({ id: 'provider-1' }),
    };

    service = new CommissionCalculationService(
      prisma as unknown as PrismaService,
      bookingService as unknown as BookingService,
      paymentService as unknown as PaymentService,
      offeringService as unknown as OfferingService,
      serviceService as unknown as ServiceService,
      providerService as unknown as ProviderService,
    );
  });

  describe('calculate', () => {
    it('rejects a booking that is not COMPLETED', async () => {
      bookingService.findByIdOrThrow.mockResolvedValue({
        ...completedBooking,
        status: BookingStatus.ACCEPTED,
      });

      await expect(service.calculate('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.commissionCalculation.create).not.toHaveBeenCalled();
    });

    it('rejects a booking that already has a calculation', async () => {
      prisma.commissionCalculation.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.calculate('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.commissionCalculation.create).not.toHaveBeenCalled();
    });

    it('throws when no rule applies, not even a PLATFORM default', async () => {
      prisma.commissionRule.findFirst.mockResolvedValue(null);

      await expect(service.calculate('booking-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.commissionCalculation.create).not.toHaveBeenCalled();
    });

    it('resolves the PROVIDER rule first when one exists', async () => {
      prisma.commissionRule.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PROVIDER
            ? Promise.resolve({
                id: 'provider-rule',
                scopeType: CommissionScopeType.PROVIDER,
                commissionType: CommissionType.PERCENTAGE,
                percentage: 10,
                fixedAmount: null,
              })
            : Promise.resolve(null),
      );
      prisma.commissionCalculation.create.mockResolvedValue({ id: 'calc-1' });

      await service.calculate('booking-1');

      expect(prisma.commissionCalculation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appliedRuleId: 'provider-rule',
          grossAmount: 599,
          commissionAmount: 59.9,
          providerEarningAmount: 539.1,
          currency: 'INR',
        }),
      });
    });

    it('falls back to PLATFORM when no more specific rule matches', async () => {
      prisma.commissionRule.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({
                id: 'platform-rule',
                scopeType: CommissionScopeType.PLATFORM,
                commissionType: CommissionType.FIXED_AMOUNT,
                percentage: null,
                fixedAmount: 50,
              })
            : Promise.resolve(null),
      );
      prisma.commissionCalculation.create.mockResolvedValue({ id: 'calc-1' });

      await service.calculate('booking-1');

      expect(prisma.commissionCalculation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appliedRuleId: 'platform-rule',
          commissionAmount: 50,
          providerEarningAmount: 549,
        }),
      });
    });

    it('caps a FIXED_AMOUNT commission at the gross amount collected', async () => {
      paymentService.sumSucceededAmount.mockResolvedValue(30);
      prisma.commissionRule.findFirst.mockImplementation(
        ({ where }: { where: { scopeType: string } }) =>
          where.scopeType === CommissionScopeType.PLATFORM
            ? Promise.resolve({
                id: 'platform-rule',
                scopeType: CommissionScopeType.PLATFORM,
                commissionType: CommissionType.FIXED_AMOUNT,
                percentage: null,
                fixedAmount: 50,
              })
            : Promise.resolve(null),
      );
      prisma.commissionCalculation.create.mockResolvedValue({ id: 'calc-1' });

      await service.calculate('booking-1');

      expect(prisma.commissionCalculation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          commissionAmount: 30,
          providerEarningAmount: 0,
        }),
      });
    });
  });

  describe('findAsProvider', () => {
    it("throws NotFoundException for another provider's calculation", async () => {
      prisma.commissionCalculation.findUnique.mockResolvedValue({
        id: 'calc-1',
        booking: { offering: { providerId: 'someone-else' } },
      });

      await expect(service.findAsProvider('user-1', 'calc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
