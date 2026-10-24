import { CoverageStatus } from '@prisma/client';
import { CoverageCheckService } from './coverage-check.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { TownVillageService } from '../../geography/town-village/town-village.service';
import type { CoverageProfileService } from '../coverage-profile/coverage-profile.service';

const mysuru = { id: 'tv-mysuru', latitude: 12.2958, longitude: 76.6394 };
const nanjangud = { id: 'tv-nanjangud', latitude: 12.1188, longitude: 76.6817 }; // ~20km from Mysuru
const bengaluru = { id: 'tv-bengaluru', latitude: 12.9716, longitude: 77.5946 }; // ~140km from Mysuru

describe('CoverageCheckService', () => {
  let prisma: {
    providerCoverageArea: { findUnique: jest.Mock; findMany: jest.Mock };
    providerCoverageProfile: { findMany: jest.Mock };
  };
  let townVillageService: { findByIdOrThrow: jest.Mock };
  let coverageProfileService: { findByProviderId: jest.Mock };
  let service: CoverageCheckService;

  beforeEach(() => {
    prisma = {
      providerCoverageArea: { findUnique: jest.fn(), findMany: jest.fn() },
      providerCoverageProfile: { findMany: jest.fn() },
    };
    townVillageService = { findByIdOrThrow: jest.fn() };
    coverageProfileService = { findByProviderId: jest.fn() };
    service = new CoverageCheckService(
      prisma as unknown as PrismaService,
      townVillageService as unknown as TownVillageService,
      coverageProfileService as unknown as CoverageProfileService,
    );
  });

  describe('isServiceable', () => {
    it('returns APPROVED_AREA when an approved coverage area exists, without checking radius', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        status: CoverageStatus.APPROVED,
      });

      const result = await service.isServiceable('provider-1', 'tv-1');

      expect(result).toEqual({ serviceable: true, reason: 'APPROVED_AREA' });
      expect(coverageProfileService.findByProviderId).not.toHaveBeenCalled();
    });

    it('ignores a PENDING coverage area and falls through to the radius check', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue({
        status: CoverageStatus.PENDING,
      });
      coverageProfileService.findByProviderId.mockResolvedValue(null);

      const result = await service.isServiceable('provider-1', 'tv-1');

      expect(result).toEqual({ serviceable: false, reason: 'NOT_SERVICEABLE' });
    });

    it("returns WITHIN_RADIUS when the target is inside the provider's radius (explicit coordinates)", async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue(null);
      coverageProfileService.findByProviderId.mockResolvedValue({
        primaryLatitude: mysuru.latitude,
        primaryLongitude: mysuru.longitude,
        primaryTownVillageId: null,
        radiusKm: 30,
      });
      townVillageService.findByIdOrThrow.mockResolvedValue(nanjangud);

      const result = await service.isServiceable('provider-1', nanjangud.id);

      expect(result).toEqual({ serviceable: true, reason: 'WITHIN_RADIUS' });
    });

    it('falls back to primaryTownVillage coordinates when explicit lat/lng are not set', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue(null);
      coverageProfileService.findByProviderId.mockResolvedValue({
        primaryLatitude: null,
        primaryLongitude: null,
        primaryTownVillageId: mysuru.id,
        radiusKm: 30,
      });
      townVillageService.findByIdOrThrow.mockImplementation((id: string) =>
        Promise.resolve(id === mysuru.id ? mysuru : nanjangud),
      );

      const result = await service.isServiceable('provider-1', nanjangud.id);

      expect(result).toEqual({ serviceable: true, reason: 'WITHIN_RADIUS' });
    });

    it('returns NOT_SERVICEABLE when the target is outside the radius', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue(null);
      coverageProfileService.findByProviderId.mockResolvedValue({
        primaryLatitude: mysuru.latitude,
        primaryLongitude: mysuru.longitude,
        primaryTownVillageId: null,
        radiusKm: 30,
      });
      townVillageService.findByIdOrThrow.mockResolvedValue(bengaluru);

      const result = await service.isServiceable('provider-1', bengaluru.id);

      expect(result).toEqual({ serviceable: false, reason: 'NOT_SERVICEABLE' });
    });

    it('returns NOT_SERVICEABLE when no coverage profile exists at all', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue(null);
      coverageProfileService.findByProviderId.mockResolvedValue(null);

      const result = await service.isServiceable('provider-1', 'tv-1');

      expect(result).toEqual({ serviceable: false, reason: 'NOT_SERVICEABLE' });
    });

    it('returns NOT_SERVICEABLE when the profile has no radiusKm set', async () => {
      prisma.providerCoverageArea.findUnique.mockResolvedValue(null);
      coverageProfileService.findByProviderId.mockResolvedValue({
        primaryLatitude: mysuru.latitude,
        primaryLongitude: mysuru.longitude,
        primaryTownVillageId: null,
        radiusKm: null,
      });

      const result = await service.isServiceable('provider-1', nanjangud.id);

      expect(result).toEqual({ serviceable: false, reason: 'NOT_SERVICEABLE' });
      expect(townVillageService.findByIdOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('listServiceableProviderIds', () => {
    it('unions providers from approved areas and radius matches without duplicates', async () => {
      prisma.providerCoverageArea.findMany.mockResolvedValue([
        { providerId: 'provider-area' },
      ]);
      prisma.providerCoverageProfile.findMany.mockResolvedValue([
        {
          providerId: 'provider-radius',
          primaryLatitude: mysuru.latitude,
          primaryLongitude: mysuru.longitude,
          primaryTownVillageId: null,
          radiusKm: 30,
        },
        {
          providerId: 'provider-area', // also has a radius profile that reaches — should not duplicate
          primaryLatitude: mysuru.latitude,
          primaryLongitude: mysuru.longitude,
          primaryTownVillageId: null,
          radiusKm: 30,
        },
        {
          providerId: 'provider-too-far',
          primaryLatitude: bengaluru.latitude,
          primaryLongitude: bengaluru.longitude,
          primaryTownVillageId: null,
          radiusKm: 5,
        },
      ]);
      townVillageService.findByIdOrThrow.mockResolvedValue(nanjangud);

      const result = await service.listServiceableProviderIds(nanjangud.id);

      expect(result.sort()).toEqual(['provider-area', 'provider-radius']);
    });
  });
});
