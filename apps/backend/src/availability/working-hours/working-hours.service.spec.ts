import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { WorkingHoursService } from './working-hours.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';

describe('WorkingHoursService', () => {
  let prisma: {
    workingHours: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let service: WorkingHoursService;

  const provider = { id: 'provider-1' };

  beforeEach(() => {
    prisma = {
      workingHours: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    service = new WorkingHoursService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
    );
  });

  describe('create', () => {
    it('rejects when startTime is not before endTime', async () => {
      await expect(
        service.create('user-1', {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '18:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.workingHours.create).not.toHaveBeenCalled();
    });

    it('rejects equal start/end times', async () => {
      await expect(
        service.create('user-1', {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates when properly ordered', async () => {
      prisma.workingHours.create.mockResolvedValue({ id: 'wh-1' });

      await service.create('user-1', {
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00',
        endTime: '18:00',
      });

      expect(prisma.workingHours.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00',
          endTime: '18:00',
        },
      });
    });
  });

  describe('update', () => {
    it('404s when not owned by the caller', async () => {
      prisma.workingHours.findUnique.mockResolvedValue({
        id: 'wh-1',
        providerId: 'someone-elses-provider',
      });

      await expect(service.update('user-1', 'wh-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates ordering using existing values when only one side changes', async () => {
      prisma.workingHours.findUnique.mockResolvedValue({
        id: 'wh-1',
        providerId: 'provider-1',
        startTime: '09:00',
        endTime: '18:00',
      });

      await expect(
        service.update('user-1', 'wh-1', { startTime: '19:00' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.workingHours.update).not.toHaveBeenCalled();
    });
  });
});
