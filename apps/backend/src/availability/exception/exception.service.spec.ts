import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExceptionType } from '@prisma/client';
import { ExceptionService } from './exception.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';

describe('ExceptionService', () => {
  let prisma: {
    availabilityException: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let service: ExceptionService;

  const provider = { id: 'provider-1' };

  beforeEach(() => {
    prisma = {
      availabilityException: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    service = new ExceptionService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
    );
  });

  describe('create', () => {
    it('rejects startDate after endDate', async () => {
      await expect(
        service.create('user-1', {
          startDate: '2026-10-25',
          endDate: '2026-10-20',
          type: ExceptionType.UNAVAILABLE,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.availabilityException.create).not.toHaveBeenCalled();
    });

    it('rejects CUSTOM_HOURS without custom times', async () => {
      await expect(
        service.create('user-1', {
          startDate: '2026-10-20',
          endDate: '2026-10-20',
          type: ExceptionType.CUSTOM_HOURS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects CUSTOM_HOURS with an inverted time range', async () => {
      await expect(
        service.create('user-1', {
          startDate: '2026-10-20',
          endDate: '2026-10-20',
          type: ExceptionType.CUSTOM_HOURS,
          customStartTime: '14:00',
          customEndTime: '10:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a valid UNAVAILABLE exception', async () => {
      prisma.availabilityException.create.mockResolvedValue({ id: 'exc-1' });

      await service.create('user-1', {
        startDate: '2026-10-20',
        endDate: '2026-10-21',
        type: ExceptionType.UNAVAILABLE,
        reason: 'Diwali holiday',
      });

      expect(prisma.availabilityException.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider-1',
          type: ExceptionType.UNAVAILABLE,
          reason: 'Diwali holiday',
        }),
      });
    });

    it('creates a valid CUSTOM_HOURS exception', async () => {
      prisma.availabilityException.create.mockResolvedValue({ id: 'exc-1' });

      await service.create('user-1', {
        startDate: '2026-10-20',
        endDate: '2026-10-20',
        type: ExceptionType.CUSTOM_HOURS,
        customStartTime: '10:00',
        customEndTime: '14:00',
      });

      expect(prisma.availabilityException.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('404s when not owned by the caller', async () => {
      prisma.availabilityException.findUnique.mockResolvedValue({
        id: 'exc-1',
        providerId: 'someone-elses-provider',
      });

      await expect(service.update('user-1', 'exc-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('requires custom times when switching type to CUSTOM_HOURS without providing them', async () => {
      prisma.availabilityException.findUnique.mockResolvedValue({
        id: 'exc-1',
        providerId: 'provider-1',
        startDate: new Date('2026-10-20'),
        endDate: new Date('2026-10-20'),
        type: ExceptionType.UNAVAILABLE,
        customStartTime: null,
        customEndTime: null,
      });

      await expect(
        service.update('user-1', 'exc-1', { type: ExceptionType.CUSTOM_HOURS }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.availabilityException.update).not.toHaveBeenCalled();
    });
  });

  describe('findCoveringDate', () => {
    it('queries with an inclusive date-range comparison', async () => {
      prisma.availabilityException.findFirst.mockResolvedValue(null);
      const date = new Date('2026-10-20');

      await service.findCoveringDate('provider-1', date);

      expect(prisma.availabilityException.findFirst).toHaveBeenCalledWith({
        where: {
          providerId: 'provider-1',
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });
    });
  });
});
