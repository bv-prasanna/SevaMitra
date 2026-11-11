import { Injectable } from '@nestjs/common';
import { CoverageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TownVillageService } from '../../geography/town-village/town-village.service';
import { CoverageProfileService } from '../coverage-profile/coverage-profile.service';
import { haversineDistanceKm } from '../../common/util/haversine';

export interface CheckResult {
  serviceable: boolean;
  reason: 'APPROVED_AREA' | 'WITHIN_RADIUS' | 'NOT_SERVICEABLE';
}

/**
 * Implements BRD §13.3's business rule directly: a provider is never
 * automatically serviceable somewhere just because they exist in the
 * same district/taluk — only an APPROVED explicit coverage area, or
 * being within a defined radius of their primary point, counts.
 */
@Injectable()
export class CoverageCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly townVillageService: TownVillageService,
    private readonly coverageProfileService: CoverageProfileService,
  ) {}

  async isServiceable(
    providerId: string,
    townVillageId: string,
  ): Promise<CheckResult> {
    const approvedArea = await this.prisma.providerCoverageArea.findUnique({
      where: { providerId_townVillageId: { providerId, townVillageId } },
    });
    if (approvedArea && approvedArea.status === CoverageStatus.APPROVED) {
      return { serviceable: true, reason: 'APPROVED_AREA' };
    }

    const withinRadius = await this.isWithinRadius(providerId, townVillageId);
    if (withinRadius) {
      return { serviceable: true, reason: 'WITHIN_RADIUS' };
    }

    return { serviceable: false, reason: 'NOT_SERVICEABLE' };
  }

  /**
   * Every provider with an APPROVED area covering this town/village, or a
   * radius profile that reaches it. O(n) over coverage profiles — fine at
   * pilot scale, not indexed for real spatial search; see
   * docs/modules/SERVICEABILITY_IMPLEMENTATION.md §8.
   */
  async listServiceableProviderIds(townVillageId: string): Promise<string[]> {
    const fromAreas = await this.prisma.providerCoverageArea.findMany({
      where: { townVillageId, status: CoverageStatus.APPROVED },
      select: { providerId: true },
    });

    const profiles = await this.prisma.providerCoverageProfile.findMany({
      where: { radiusKm: { not: null } },
    });
    const target = await this.townVillageService.findByIdOrThrow(townVillageId);
    const fromRadius: string[] = [];
    for (const profile of profiles) {
      if (
        await this.profileReaches(profile, target.latitude, target.longitude)
      ) {
        fromRadius.push(profile.providerId);
      }
    }

    return Array.from(
      new Set([...fromAreas.map((a) => a.providerId), ...fromRadius]),
    );
  }

  private async isWithinRadius(
    providerId: string,
    townVillageId: string,
  ): Promise<boolean> {
    const profile =
      await this.coverageProfileService.findByProviderId(providerId);
    if (!profile || profile.radiusKm === null) {
      return false;
    }
    const target = await this.townVillageService.findByIdOrThrow(townVillageId);
    return this.profileReaches(profile, target.latitude, target.longitude);
  }

  private async profileReaches(
    profile: {
      primaryLatitude: number | null;
      primaryLongitude: number | null;
      primaryTownVillageId: string | null;
      radiusKm: number | null;
    },
    targetLatitude: number | null,
    targetLongitude: number | null,
  ): Promise<boolean> {
    if (
      profile.radiusKm === null ||
      targetLatitude === null ||
      targetLongitude === null
    ) {
      return false;
    }

    let originLat = profile.primaryLatitude;
    let originLng = profile.primaryLongitude;
    if (
      (originLat === null || originLng === null) &&
      profile.primaryTownVillageId
    ) {
      const primary = await this.townVillageService.findByIdOrThrow(
        profile.primaryTownVillageId,
      );
      originLat = primary.latitude;
      originLng = primary.longitude;
    }
    if (originLat === null || originLng === null) {
      return false;
    }

    const distance = haversineDistanceKm(
      originLat,
      originLng,
      targetLatitude,
      targetLongitude,
    );
    return distance <= profile.radiusKm;
  }
}
