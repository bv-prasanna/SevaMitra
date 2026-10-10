import { ConflictException, NotFoundException } from '@nestjs/common';
import { CoverageProfileService } from './coverage-profile.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';
import type { TownVillageService } from '../../geography/town-village/town-village.service';

describe('CoverageProfileService', () => {
  let prisma: {
    providerCoverageProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let townVillageService: { findByIdOrThrow: jest.Mock };
  let service: CoverageProfileService;

  const provider = { id: 'provider-1' };

  beforeEach(() => {
    prisma = {
      providerCoverageProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    townVillageService = { findByIdOrThrow: jest.fn() };
    service = new CoverageProfileService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
      townVillageService as unknown as TownVillageService,
    );
  });

  describe('create', () => {
    it('rejects when a profile already exists', async () => {
      prisma.providerCoverageProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
      });

      await expect(service.create('user-1', {})).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.providerCoverageProfile.create).not.toHaveBeenCalled();
    });

    it('validates primaryTownVillageId when provided', async () => {
      prisma.providerCoverageProfile.findUnique.mockResolvedValue(null);
      prisma.providerCoverageProfile.create.mockResolvedValue({
        id: 'profile-1',
      });

      await service.create('user-1', {
        primaryTownVillageId: 'tv-1',
        radiusKm: 20,
      });

      expect(townVillageService.findByIdOrThrow).toHaveBeenCalledWith('tv-1');
      expect(prisma.providerCoverageProfile.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          primaryTownVillageId: 'tv-1',
          primaryLatitude: undefined,
          primaryLongitude: undefined,
          radiusKm: 20,
        },
      });
    });
  });

  describe('findOwn', () => {
    it('throws NotFound when no profile exists', async () => {
      prisma.providerCoverageProfile.findUnique.mockResolvedValue(null);

      await expect(service.findOwn('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws NotFound when no profile exists', async () => {
      prisma.providerCoverageProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
