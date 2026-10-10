import { BadRequestException, ConflictException } from '@nestjs/common';
import { RuntimeFlagsService } from './runtime-flags.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('RuntimeFlagsService', () => {
  const prisma = {
    runtimeFlag: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };
  let flags: RuntimeFlagsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.runtimeFlag.findMany.mockResolvedValue([]);
    flags = new RuntimeFlagsService(prisma as unknown as PrismaService);
  });

  it('permits existing bookings when there are no flags', async () => {
    await expect(flags.assertBookingAllowed('service-1', 'town-1')).resolves.toBeUndefined();
  });

  it('blocks maintenance mode', async () => {
    prisma.runtimeFlag.findMany.mockResolvedValue([{key:'bookings.enabled',enabled:false}]);
    await expect(flags.assertBookingAllowed('service-1','town-1')).rejects.toThrow(ConflictException);
  });

  it('blocks an explicitly disabled service', async () => {
    prisma.runtimeFlag.findMany.mockResolvedValue([{key:'service.service-1.enabled',enabled:false}]);
    await expect(flags.assertBookingAllowed('service-1','town-1')).rejects.toThrow(ConflictException);
  });

  it('requires geography allow-list when pilot mode is enabled', async () => {
    prisma.runtimeFlag.findMany.mockResolvedValue([{key:'pilot.enabled',enabled:true}]);
    await expect(flags.assertBookingAllowed('service-1','town-1')).rejects.toThrow(ConflictException);
    prisma.runtimeFlag.findMany.mockResolvedValue([
      {key:'pilot.enabled',enabled:true},
      {key:'geography.town-1.enabled',enabled:true},
    ]);
    await expect(flags.assertBookingAllowed('service-1','town-1')).resolves.toBeUndefined();
  });

  it('rejects invalid flag keys', async () => {
    await expect(flags.set('!!', false, 'safety stop', 'admin')).rejects.toThrow(BadRequestException);
    expect(prisma.runtimeFlag.upsert).not.toHaveBeenCalled();
  });

  it('records actor, reason and value for admin changes', async () => {
    await flags.set('bookings.enabled', false, 'pilot paused', 'admin-1');
    expect(prisma.runtimeFlag.upsert).toHaveBeenCalledWith({
      where: {key:'bookings.enabled'},
      create: {key:'bookings.enabled',enabled:false,reason:'pilot paused',updatedBy:'admin-1'},
      update: {enabled:false,reason:'pilot paused',updatedBy:'admin-1'},
    });
  });
});
