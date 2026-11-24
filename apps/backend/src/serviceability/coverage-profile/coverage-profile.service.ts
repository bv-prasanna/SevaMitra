import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProviderCoverageProfile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { TownVillageService } from '../../geography/town-village/town-village.service';
import { CreateCoverageProfileDto } from '../dto/create-coverage-profile.dto';
import { UpdateCoverageProfileDto } from '../dto/update-coverage-profile.dto';

@Injectable()
export class CoverageProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly townVillageService: TownVillageService,
  ) {}

  async create(
    userId: string,
    dto: CreateCoverageProfileDto,
  ): Promise<ProviderCoverageProfile> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);

    const existing = await this.prisma.providerCoverageProfile.findUnique({
      where: { providerId: provider.id },
    });
    if (existing) {
      throw new ConflictException('Coverage profile already exists');
    }
    if (dto.primaryTownVillageId) {
      await this.townVillageService.findByIdOrThrow(dto.primaryTownVillageId);
    }

    return this.prisma.providerCoverageProfile.create({
      data: {
        providerId: provider.id,
        primaryTownVillageId: dto.primaryTownVillageId,
        primaryLatitude: dto.primaryLatitude,
        primaryLongitude: dto.primaryLongitude,
        radiusKm: dto.radiusKm,
      },
    });
  }

  async findOwn(userId: string): Promise<ProviderCoverageProfile> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.getByProviderIdOrThrow(provider.id);
  }

  async update(
    userId: string,
    dto: UpdateCoverageProfileDto,
  ): Promise<ProviderCoverageProfile> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const existing = await this.getByProviderIdOrThrow(provider.id);
    if (dto.primaryTownVillageId) {
      await this.townVillageService.findByIdOrThrow(dto.primaryTownVillageId);
    }

    return this.prisma.providerCoverageProfile.update({
      where: { id: existing.id },
      data: {
        primaryTownVillageId: dto.primaryTownVillageId,
        primaryLatitude: dto.primaryLatitude,
        primaryLongitude: dto.primaryLongitude,
        radiusKm: dto.radiusKm,
      },
    });
  }

  /** Internal — used by CoverageCheckService to resolve a provider's radius config. Returns null rather than throwing (a coverage profile is optional). */
  findByProviderId(
    providerId: string,
  ): Promise<ProviderCoverageProfile | null> {
    return this.prisma.providerCoverageProfile.findUnique({
      where: { providerId },
    });
  }

  private async getByProviderIdOrThrow(
    providerId: string,
  ): Promise<ProviderCoverageProfile> {
    const profile = await this.prisma.providerCoverageProfile.findUnique({
      where: { providerId },
    });
    if (!profile) {
      throw new NotFoundException(
        'Coverage profile not found — create one first (POST /serviceability/coverage/me)',
      );
    }
    return profile;
  }
}
