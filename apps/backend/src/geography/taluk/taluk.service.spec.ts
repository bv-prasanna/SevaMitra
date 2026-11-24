import { ConflictException, NotFoundException } from '@nestjs/common';
import { TalukService } from './taluk.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { DistrictService } from '../district/district.service';

describe('TalukService', () => {
  let prisma: {
    taluk: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let districtService: { assertExistsOrThrow: jest.Mock };
  let service: TalukService;

  beforeEach(() => {
    prisma = {
      taluk: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    districtService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    service = new TalukService(
      prisma as unknown as PrismaService,
      districtService as unknown as DistrictService,
    );
  });

  describe('create', () => {
    it('validates districtId and rejects a duplicate name within the district', async () => {
      prisma.taluk.findUnique.mockResolvedValue({ id: 'taluk-1' });

      await expect(
        service.create({ districtId: 'dist-1', name: 'Mysuru Taluk' }),
      ).rejects.toThrow(ConflictException);
      expect(districtService.assertExistsOrThrow).toHaveBeenCalledWith(
        'dist-1',
      );
      expect(prisma.taluk.create).not.toHaveBeenCalled();
    });

    it('creates when the district exists and the name is free', async () => {
      prisma.taluk.findUnique.mockResolvedValue(null);
      prisma.taluk.create.mockResolvedValue({ id: 'taluk-1' });

      await service.create({ districtId: 'dist-1', name: 'Mysuru Taluk' });

      expect(prisma.taluk.create).toHaveBeenCalledWith({
        data: { districtId: 'dist-1', name: 'Mysuru Taluk' },
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when the taluk does not exist', async () => {
      prisma.taluk.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates the new districtId when re-parenting', async () => {
      prisma.taluk.findUnique
        .mockResolvedValueOnce({ id: 'taluk-1', districtId: 'dist-1' })
        .mockResolvedValueOnce(null);
      prisma.taluk.update.mockResolvedValue({});

      await service.update('taluk-1', { districtId: 'dist-2' });

      expect(districtService.assertExistsOrThrow).toHaveBeenCalledWith(
        'dist-2',
      );
    });
  });
});
