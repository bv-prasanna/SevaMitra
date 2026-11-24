import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';

describe('ScheduleService', () => {
  let prisma: {
    availabilitySchedule: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let service: ScheduleService;

  const provider = { id: 'provider-1' };

  beforeEach(() => {
    prisma = {
      availabilitySchedule: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    service = new ScheduleService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
    );
  });

  describe('create', () => {
    it('rejects when a schedule already exists', async () => {
      prisma.availabilitySchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
      });

      await expect(service.create('user-1', {})).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.availabilitySchedule.create).not.toHaveBeenCalled();
    });

    it('creates a schedule when none exists', async () => {
      prisma.availabilitySchedule.findUnique.mockResolvedValue(null);
      prisma.availabilitySchedule.create.mockResolvedValue({ id: 'sched-1' });

      await service.create('user-1', {
        maxDailyBookings: 6,
        maxConcurrentBookings: 2,
      });

      expect(prisma.availabilitySchedule.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          maxDailyBookings: 6,
          maxConcurrentBookings: 2,
        },
      });
    });
  });

  describe('findOwn', () => {
    it('throws NotFound when no schedule exists', async () => {
      prisma.availabilitySchedule.findUnique.mockResolvedValue(null);

      await expect(service.findOwn('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
