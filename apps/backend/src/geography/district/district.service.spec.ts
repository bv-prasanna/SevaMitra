import { ConflictException, NotFoundException } from '@nestjs/common';
import { DistrictService } from './district.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StateService } from '../state/state.service';

describe('DistrictService', () => {
  let prisma: {
    district: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let stateService: { assertExistsOrThrow: jest.Mock };
  let service: DistrictService;

  beforeEach(() => {
    prisma = {
      district: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    stateService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    service = new DistrictService(
      prisma as unknown as PrismaService,
      stateService as unknown as StateService,
    );
  });

  describe('create', () => {
    it('validates stateId and name-uniqueness-within-state before creating', async () => {
      prisma.district.findUnique.mockResolvedValue(null);
      prisma.district.create.mockResolvedValue({ id: 'dist-1' });

      await service.create({ stateId: 'state-1', name: 'Mysuru' });

      expect(stateService.assertExistsOrThrow).toHaveBeenCalledWith('state-1');
      expect(prisma.district.findUnique).toHaveBeenCalledWith({
        where: { stateId_name: { stateId: 'state-1', name: 'Mysuru' } },
      });
      expect(prisma.district.create).toHaveBeenCalledWith({
        data: { stateId: 'state-1', name: 'Mysuru' },
      });
    });

    it('rejects a duplicate name within the same state', async () => {
      prisma.district.findUnique.mockResolvedValue({ id: 'dist-1' });

      await expect(
        service.create({ stateId: 'state-1', name: 'Mysuru' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.district.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFound when the district does not exist', async () => {
      prisma.district.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('checks name uniqueness against the current state when stateId is not changing', async () => {
      prisma.district.findUnique
        .mockResolvedValueOnce({ id: 'dist-1', stateId: 'state-1' })
        .mockResolvedValueOnce(null);
      prisma.district.update.mockResolvedValue({});

      await service.update('dist-1', { name: 'Renamed' });

      expect(prisma.district.findUnique).toHaveBeenLastCalledWith({
        where: { stateId_name: { stateId: 'state-1', name: 'Renamed' } },
      });
    });

    it('validates the new stateId when re-parenting', async () => {
      prisma.district.findUnique
        .mockResolvedValueOnce({ id: 'dist-1', stateId: 'state-1' })
        .mockResolvedValueOnce(null);
      prisma.district.update.mockResolvedValue({});

      await service.update('dist-1', { stateId: 'state-2' });

      expect(stateService.assertExistsOrThrow).toHaveBeenCalledWith('state-2');
    });
  });
});
