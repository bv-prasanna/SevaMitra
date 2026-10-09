import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingParty, BookingStatus, PricingModel, ProviderStatus, VerificationStatus } from '@prisma/client';
import { BookingService } from './booking.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CustomerService } from '../customer/customer.service';
import type { ProviderService } from '../provider/provider.service';
import type { OfferingService } from '../provider-offering/offering.service';
import type { TownVillageService } from '../geography/town-village/town-village.service';
import type { CoverageCheckService } from '../serviceability/check/coverage-check.service';
import type { AvailabilityCheckService } from '../availability/check/availability-check.service';

describe('BookingService', () => {
  let prisma: {
    booking: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
    providerProfile: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let customerService: { getActiveProfileOrThrow: jest.Mock };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let offeringService: { findOneActive: jest.Mock };
  let townVillageService: { findByIdOrThrow: jest.Mock };
  let coverageCheckService: { isServiceable: jest.Mock };
  let availabilityCheckService: { getAvailability: jest.Mock };
  let service: BookingService;

  const customer = { id: 'customer-1' };
  const provider = { id: 'provider-1' };
  const offering = {
    id: 'offering-1',
    providerId: 'provider-1',
    isActive: true,
    pricingModel: PricingModel.FIXED,
    amount: 500,
    visitFee: null,
    currency: 'INR',
  };

  const createDto = {
    offeringId: 'offering-1',
    townVillageId: 'town-1',
    scheduledDate: '2026-10-20',
    scheduledStartTime: '09:00',
    scheduledEndTime: '10:00',
  };

  beforeEach(() => {
    prisma = {
      booking: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      providerProfile: {findUnique: jest.fn().mockResolvedValue({
        status:ProviderStatus.ACTIVE,verificationStatus:VerificationStatus.VERIFIED,
      })},
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn:(tx:unknown)=>Promise<unknown>)=>
      fn({booking:prisma.booking,$queryRaw:jest.fn().mockResolvedValue([])}));
    customerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(customer),
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    offeringService = { findOneActive: jest.fn().mockResolvedValue(offering) };
    townVillageService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'town-1' }),
    };
    coverageCheckService = {
      isServiceable: jest.fn().mockResolvedValue({ serviceable: true }),
    };
    availabilityCheckService = {
      getAvailability: jest.fn().mockResolvedValue({
        available: true,
        windows: [{ start: '08:00', end: '18:00' }],
      }),
    };

    service = new BookingService(
      prisma as unknown as PrismaService,
      customerService as unknown as CustomerService,
      providerService as unknown as ProviderService,
      offeringService as unknown as OfferingService,
      townVillageService as unknown as TownVillageService,
      coverageCheckService as unknown as CoverageCheckService,
      availabilityCheckService as unknown as AvailabilityCheckService,
    );
  });

  describe('create', () => {
    it('creates a booking copying pricing snapshot from the offering', async () => {
      prisma.booking.create.mockResolvedValue({ id: 'booking-1' });

      const result = await service.create('user-1', createDto);

      expect(prisma.booking.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'customer-1',
          offeringId: 'offering-1',
          townVillageId: 'town-1',
          pricingModel: PricingModel.FIXED,
          amount: 500,
          visitFee: null,
          currency: 'INR',
        }),
      });
      expect(result).toEqual({ id: 'booking-1' });
    });

    it('reserves the requested provider slot inside a serializable transaction', async () => {
      prisma.booking.create.mockResolvedValue({ id: 'booking-1' });
      await service.create('user-1', createDto);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          status: {in:[BookingStatus.REQUESTED,BookingStatus.ACCEPTED]},
          scheduledStartTime:{lt:'10:00'},
          scheduledEndTime:{gt:'09:00'},
        }),
      }));
    });

    it('rejects an overlapping active booking instead of double-booking', async () => {
      prisma.booking.findFirst.mockResolvedValue({id:'existing'});
      await expect(service.create('user-1',createDto)).rejects.toThrow(ConflictException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('allows scheduling adjacent non-overlapping slots', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.booking.create.mockResolvedValue({id:'new-booking'});
      await expect(service.create('user-1',createDto)).resolves.toEqual({id:'new-booking'});
    });

    it('rechecks provider verification on each booking attempt', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue({
        status:ProviderStatus.PENDING,verificationStatus:VerificationStatus.UNVERIFIED,
      });
      await expect(service.create('user-1',createDto)).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a provider booking their own offering', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue({
        userId: 'user-1',
        status: ProviderStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      });
      await expect(service.create('user-1', createDto)).rejects.toThrow(ConflictException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('returns the original booking when an offline request is replayed', async () => {
      const previous = {
        id: 'booking-previous', customerId: 'customer-1',
        offeringId: createDto.offeringId, townVillageId: createDto.townVillageId,
        scheduledDate: new Date(createDto.scheduledDate),
        scheduledStartTime: createDto.scheduledStartTime,
        scheduledEndTime: createDto.scheduledEndTime, notes: null,
      };
      prisma.booking.findFirst.mockResolvedValueOnce(previous);
      const response = await service.create('user-1', {
        ...createDto, clientRequestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      });
      expect(response.id).toBe('booking-previous');
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('blocks replay of a client request ID with changed time', async () => {
      prisma.booking.findFirst.mockResolvedValueOnce({
        id: 'old', offeringId: createDto.offeringId, townVillageId: createDto.townVillageId,
        scheduledDate: new Date(createDto.scheduledDate),
        scheduledStartTime: '08:00', scheduledEndTime: createDto.scheduledEndTime, notes: null,
      });
      await expect(service.create('user-1', {
        ...createDto, clientRequestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      })).rejects.toThrow(ConflictException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('rejects when the offering is inactive', async () => {
      offeringService.findOneActive.mockResolvedValue({
        ...offering,
        isActive: false,
      });

      await expect(service.create('user-1', createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('rejects when scheduledStartTime is not before scheduledEndTime', async () => {
      await expect(
        service.create('user-1', {
          ...createDto,
          scheduledStartTime: '10:00',
          scheduledEndTime: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('rejects when the provider does not cover the requested location', async () => {
      coverageCheckService.isServiceable.mockResolvedValue({
        serviceable: false,
      });

      await expect(service.create('user-1', createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('rejects when the requested time does not fit an availability window', async () => {
      availabilityCheckService.getAvailability.mockResolvedValue({
        available: true,
        windows: [{ start: '14:00', end: '18:00' }],
      });

      await expect(service.create('user-1', createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('rejects when the provider is unavailable that day', async () => {
      availabilityCheckService.getAvailability.mockResolvedValue({
        available: false,
        windows: [],
      });

      await expect(service.create('user-1', createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('ownership enforcement', () => {
    it("findAsCustomer throws NotFoundException for another customer's booking", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        customerId: 'someone-else',
      });

      await expect(
        service.findAsCustomer('user-1', 'booking-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('findAsCustomer throws NotFoundException when the booking does not exist', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.findAsCustomer('user-1', 'booking-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it("findAsProvider throws NotFoundException for another provider's booking", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        offering: { providerId: 'someone-else' },
      });

      await expect(
        service.findAsProvider('user-1', 'booking-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('state transitions', () => {
    it('acceptAsProvider succeeds from REQUESTED', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.REQUESTED,
        offering: { providerId: 'provider-1' },
      });
      prisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ACCEPTED,
      });

      const result = await service.acceptAsProvider('user-1', 'booking-1');

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'booking-1' }),
        data: { status: BookingStatus.ACCEPTED },
      });
      expect(result.status).toBe(BookingStatus.ACCEPTED);
    });

    it('acceptAsProvider rejects from a non-REQUESTED status', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ACCEPTED,
        offering: { providerId: 'provider-1' },
      });

      await expect(
        service.acceptAsProvider('user-1', 'booking-1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('cancelAsCustomer records the cancelling party and reason', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ACCEPTED,
        customerId: 'customer-1',
      });
      prisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.CANCELLED,
      });

      await service.cancelAsCustomer('user-1', 'booking-1', {
        reason: 'Change of plans',
      });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'booking-1' }),
        data: expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancelledBy: BookingParty.CUSTOMER,
          cancellationReason: 'Change of plans',
        }),
      });
    });

    it('cancelAsCustomer rejects a terminal booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.COMPLETED,
        customerId: 'customer-1',
      });

      await expect(
        service.cancelAsCustomer('user-1', 'booking-1', {}),
      ).rejects.toThrow(ConflictException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('completeAsProvider succeeds from ACCEPTED and stamps confirmation time', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ACCEPTED,
        offering: { providerId: 'provider-1' },
      });
      prisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.COMPLETED,
      });

      await service.completeAsProvider('user-1', 'booking-1');

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'booking-1' }),
        data: expect.objectContaining({
          status: BookingStatus.COMPLETED,
          providerConfirmedCompletionAt: expect.any(Date),
        }),
      });
    });

    it('confirmCompletionAsCustomer rejects when not yet COMPLETED', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ACCEPTED,
        customerId: 'customer-1',
      });

      await expect(
        service.confirmCompletionAsCustomer('user-1', 'booking-1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it('reportProviderNoShow records the no-show party from an ACCEPTED booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.ACCEPTED,
        customerId: 'customer-1',
      });
      prisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.NO_SHOW,
      });

      await service.reportProviderNoShow('user-1', 'booking-1');

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'booking-1' }),
        data: expect.objectContaining({
          status: BookingStatus.NO_SHOW,
          noShowBy: BookingParty.PROVIDER,
        }),
      });
    });

    it('rejectAsProvider succeeds from REQUESTED and records the reason', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.REQUESTED,
        offering: { providerId: 'provider-1' },
      });
      prisma.booking.update.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.REJECTED,
      });

      await service.rejectAsProvider('user-1', 'booking-1', {
        reason: 'Fully booked',
      });

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 'booking-1' }),
        data: expect.objectContaining({
          status: BookingStatus.REJECTED,
          rejectionReason: 'Fully booked',
        }),
      });
    });
  });

  describe('listing', () => {
    it('listAsCustomer scopes results to the current customer and optional status', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      await service.listAsCustomer('user-1', BookingStatus.ACCEPTED);

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1', status: BookingStatus.ACCEPTED },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('listAsProvider scopes results via the offering relation', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      await service.listAsProvider('user-1', undefined);

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: { offering: { providerId: 'provider-1' }, status: undefined },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
