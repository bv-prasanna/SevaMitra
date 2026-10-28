import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoverageStatus, ProviderCoverageArea } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { TownVillageService } from '../../geography/town-village/town-village.service';
import { CreateCoverageAreaDto } from '../dto/create-coverage-area.dto';
import { ReviewCoverageAreaDto } from '../dto/review-coverage-area.dto';

const RESUBMITTABLE_STATUSES: CoverageStatus[] = [CoverageStatus.REJECTED];

@Injectable()
export class CoverageAreaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly townVillageService: TownVillageService,
  ) {}

  /** Proposes a village for coverage, or re-proposes (resets in place) a previously REJECTED one — same resubmission shape as Provider Onboarding. */
  async propose(
    userId: string,
    dto: CreateCoverageAreaDto,
  ): Promise<ProviderCoverageArea> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    await this.townVillageService.findByIdOrThrow(dto.townVillageId);

    const existing = await this.prisma.providerCoverageArea.findUnique({
      where: {
        providerId_townVillageId: {
          providerId: provider.id,
          townVillageId: dto.townVillageId,
        },
      },
    });

    if (existing) {
      if (!RESUBMITTABLE_STATUSES.includes(existing.status)) {
        throw new ConflictException(
          'This town/village has already been proposed',
        );
      }
      return this.prisma.providerCoverageArea.update({
        where: { id: existing.id },
        data: {
          status: CoverageStatus.PENDING,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    }

    return this.prisma.providerCoverageArea.create({
      data: { providerId: provider.id, townVillageId: dto.townVillageId },
    });
  }

  async listOwn(userId: string): Promise<ProviderCoverageArea[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.providerCoverageArea.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** A provider may withdraw their own proposal regardless of its status — this is their own request, not shared reference data. */
  async removeOwn(userId: string, id: string): Promise<void> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const area = await this.prisma.providerCoverageArea.findUnique({
      where: { id },
    });
    if (!area || area.providerId !== provider.id) {
      throw new NotFoundException('Coverage area not found');
    }
    await this.prisma.providerCoverageArea.delete({ where: { id } });
  }

  findAll(filter: {
    status?: CoverageStatus;
    providerId?: string;
  }): Promise<ProviderCoverageArea[]> {
    return this.prisma.providerCoverageArea.findMany({
      where: { status: filter.status, providerId: filter.providerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async review(
    id: string,
    reviewerId: string,
    dto: ReviewCoverageAreaDto,
  ): Promise<ProviderCoverageArea> {
    const area = await this.prisma.providerCoverageArea.findUnique({
      where: { id },
    });
    if (!area) {
      throw new NotFoundException('Coverage area not found');
    }
    if (area.status !== CoverageStatus.PENDING) {
      throw new ConflictException(
        'This coverage area has already been decided',
      );
    }

    return this.prisma.providerCoverageArea.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }
}
