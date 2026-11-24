import { ConflictException, NotFoundException } from '@nestjs/common';
import { TownVillageService } from './town-village.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { TalukService } from '../taluk/taluk.service';

describe('TownVillageService', () => {
  let prisma: {
    townVillage: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let talukService: { assertExistsOrThrow: jest.Mock };
  let service: TownVillageService;

  beforeEach(() => {
    prisma = {
      townVillage: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    talukService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    service = new TownVillageService(
      prisma as unknown as PrismaService,
      talukService as unknown as TalukService,
    );
  });

  describe('create', () => {
    it('validates the taluk and rejects a duplicate name within it', async () => {
      prisma.townVillage.findUnique.mockResolvedValue({ id: 'tv-1' });

      await expect(
        service.create('taluk-1', { name: 'Nanjangud', pincode: '571301' }),
      ).rejects.toThrow(ConflictException);
      expect(talukService.assertExistsOrThrow).toHaveBeenCalledWith('taluk-1');
      expect(prisma.townVillage.create).not.toHaveBeenCalled();
    });
  });

  describe('update — ownership', () => {
    it('404s when the town/village belongs to a different taluk', async () => {
      prisma.townVillage.findUnique.mockResolvedValue({
        id: 'tv-1',
        talukId: 'other-taluk',
      });

      await expect(
        service.update('taluk-1', 'tv-1', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.townVillage.update).not.toHaveBeenCalled();
    });

    it('404s when the town/village does not exist', async () => {
      prisma.townVillage.findUnique.mockResolvedValue(null);

      await expect(
        service.update('taluk-1', 'missing', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates a town/village owned by the given taluk', async () => {
      prisma.townVillage.findUnique
        .mockResolvedValueOnce({ id: 'tv-1', talukId: 'taluk-1' })
        .mockResolvedValueOnce(null);
      prisma.townVillage.update.mockResolvedValue({});

      await service.update('taluk-1', 'tv-1', { name: 'New Name' });

      expect(prisma.townVillage.update).toHaveBeenCalledWith({
        where: { id: 'tv-1' },
        data: {
          name: 'New Name',
          pincode: undefined,
          latitude: undefined,
          longitude: undefined,
          isActive: undefined,
        },
      });
    });
  });

  describe('findByIdOrThrow', () => {
    it('throws NotFound for a missing town/village', async () => {
      prisma.townVillage.findUnique.mockResolvedValue(null);

      await expect(service.findByIdOrThrow('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the town/village regardless of which taluk it belongs to', async () => {
      const townVillage = { id: 'tv-1', talukId: 'any-taluk' };
      prisma.townVillage.findUnique.mockResolvedValue(townVillage);

      await expect(service.findByIdOrThrow('tv-1')).resolves.toBe(townVillage);
    });
  });
});
