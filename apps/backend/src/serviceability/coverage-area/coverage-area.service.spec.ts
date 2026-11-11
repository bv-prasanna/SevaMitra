import { ConflictException, NotFoundException } from '@nestjs/common';
import { CoverageStatus } from '@prisma/client';
import { CoverageAreaService } from './coverage-area.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';
import type { TownVillageService } from '../../geography/town-village/town-village.service';

describe('CoverageAreaService', () => {
  let prisma: {
    providerCoverageArea: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
  };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let townVillageService: { findByIdOrThrow: jest.Mock };
  let service: CoverageAreaService;

  const provider = { id: 'provider-1' };

  beforeEach(() => {
    prisma = {
      providerCoverageArea: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    townVillageService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'tv-1' }),
    };
    service = new CoverageAreaService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
      townVillageService as unknown as TownVillageService,
    );
  });

  describe('propose', () => {
    it('validates the town/village before proposing', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue(null);
      prisma.providerCoverageArea.create.mockResolvedValue({ id: 'area-1' });

      await service.propose('user-1', { townVillageId: 'tv-1' });

      expect(townVillageService.findByIdOrThrow).toHaveBeenCalledWith('tv-1');
      expect(prisma.providerCoverageArea.create).toHaveBeenCalledWith({
        data: { providerId: 'provider-1', townVillageId: 'tv-1' },
      });
    });

    it('rejects proposing a village already PENDING/APPROVED', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        id: 'area-1',
        status: CoverageStatus.APPROVED,
      });

      await expect(
        service.propose('user-1', { townVillageId: 'tv-1' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.providerCoverageArea.create).not.toHaveBeenCalled();
    });

    it('resets a REJECTED proposal in place instead of creating a new row', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        id: 'area-1',
        status: CoverageStatus.REJECTED,
      });
      prisma.providerCoverageArea.update.mockResolvedValue({ id: 'area-1' });

      await service.propose('user-1', { townVillageId: 'tv-1' });

      expect(prisma.providerCoverageArea.create).not.toHaveBeenCalled();
      expect(prisma.providerCoverageArea.update).toHaveBeenCalledWith({
        where: { id: 'area-1' },
        data: {
          status: CoverageStatus.PENDING,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    });
  });

  describe('removeOwn', () => {
    it('404s when the area belongs to a different provider', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        id: 'area-1',
        providerId: 'someone-elses-provider',
      });

      await expect(service.removeOwn('user-1', 'area-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.providerCoverageArea.delete).not.toHaveBeenCalled();
    });

    it('deletes an area owned by the caller regardless of status', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        id: 'area-1',
        providerId: 'provider-1',
        status: CoverageStatus.APPROVED,
      });
      prisma.providerCoverageArea.delete.mockResolvedValue({});

      await service.removeOwn('user-1', 'area-1');

      expect(prisma.providerCoverageArea.delete).toHaveBeenCalledWith({
        where: { id: 'area-1' },
      });
    });
  });

  describe('review', () => {
    it('rejects reviewing an already-decided area', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        id: 'area-1',
        status: CoverageStatus.APPROVED,
      });

      await expect(
        service.review('area-1', 'reviewer-1', {
          decision: CoverageStatus.REJECTED,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('approves a PENDING area', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        id: 'area-1',
        status: CoverageStatus.PENDING,
      });
      prisma.providerCoverageArea.update.mockResolvedValue({});

      await service.review('area-1', 'reviewer-1', {
        decision: CoverageStatus.APPROVED,
      });

      expect(prisma.providerCoverageArea.update).toHaveBeenCalledWith({
        where: { id: 'area-1' },
        data: expect.objectContaining({
          status: CoverageStatus.APPROVED,
          reviewedBy: 'reviewer-1',
        }),
      });
    });
  });
});
