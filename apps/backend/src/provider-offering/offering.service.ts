import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingDocumentReviewStatus, ProviderOffering, ProviderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderService } from '../provider/provider.service';
import { ServiceService } from '../catalogue/service/service.service';
import { VariantService } from '../catalogue/variant/variant.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';

@Injectable()
export class OfferingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    private readonly serviceService: ServiceService,
    private readonly variantService: VariantService,
  ) {}

  async create(
    userId: string,
    dto: CreateOfferingDto,
  ): Promise<ProviderOffering> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    if (provider.status !== ProviderStatus.ACTIVE) {
      throw new ConflictException(
        'Provider must be verified and active before creating offerings',
      );
    }
    await this.serviceService.assertExistsOrThrow(dto.serviceId);
    await this.assertNoComplianceHold(provider.id, dto.serviceId);
    if (dto.variantId) {
      await this.variantService.assertBelongsToService(
        dto.serviceId,
        dto.variantId,
      );
    }
    await this.assertNoDuplicateOffering(
      provider.id,
      dto.serviceId,
      dto.variantId ?? null,
    );

    return this.prisma.providerOffering.create({
      data: {
        providerId: provider.id,
        serviceId: dto.serviceId,
        variantId: dto.variantId,
        pricingModel: dto.pricingModel,
        amount: dto.amount,
        visitFee: dto.visitFee,
        travelFeeNote: dto.travelFeeNote,
        currency: dto.currency,
        notes: dto.notes,
      },
    });
  }

  async listOwn(userId: string): Promise<ProviderOffering[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.providerOffering.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOwn(userId: string, id: string): Promise<ProviderOffering> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.getOwnedOfferingOrThrow(provider.id, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateOfferingDto,
  ): Promise<ProviderOffering> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const existing = await this.getOwnedOfferingOrThrow(provider.id, id);
    if (existing.complianceSuspendedAt && (dto.isActive !== undefined || dto.serviceId !== undefined)) {
      throw new ConflictException('This offering is on a compliance hold. Complete document renewal and review before changing its listing state or category.');
    }
    if (dto.serviceId) {
      await this.serviceService.assertExistsOrThrow(dto.serviceId);
      await this.assertNoComplianceHold(provider.id, dto.serviceId);
    } else if (dto.isActive === true) {
      await this.assertNoComplianceHold(provider.id, existing.serviceId);
    }
    if (dto.variantId) {
      const effectiveServiceId = dto.serviceId ?? existing.serviceId;
      await this.variantService.assertBelongsToService(
        effectiveServiceId,
        dto.variantId,
      );
    }

    return this.prisma.providerOffering.update({
      where: { id },
      data: {
        serviceId: dto.serviceId,
        variantId: dto.variantId,
        pricingModel: dto.pricingModel,
        amount: dto.amount,
        visitFee: dto.visitFee,
        travelFeeNote: dto.travelFeeNote,
        currency: dto.currency,
        notes: dto.notes,
        isActive: dto.isActive,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    await this.getOwnedOfferingOrThrow(provider.id, id);
    await this.prisma.providerOffering.delete({ where: { id } });
  }

  findAll(filter: {
    serviceId?: string;
    providerId?: string;
  }): Promise<ProviderOffering[]> {
    return this.prisma.providerOffering.findMany({
      where: {
        serviceId: filter.serviceId,
        providerId: filter.providerId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneActive(id: string): Promise<ProviderOffering> {
    const offering = await this.prisma.providerOffering.findUnique({
      where: { id },
    });
    if (!offering || !offering.isActive || offering.complianceSuspendedAt) {
      throw new NotFoundException('Offering not found');
    }
    await this.assertNoComplianceHold(offering.providerId, offering.serviceId);
    return offering;
  }

  private async getOwnedOfferingOrThrow(
    providerId: string,
    id: string,
  ): Promise<ProviderOffering> {
    const offering = await this.prisma.providerOffering.findUnique({
      where: { id },
    });
    if (!offering || offering.providerId !== providerId) {
      throw new NotFoundException('Offering not found');
    }
    return offering;
  }

  private async assertNoComplianceHold(providerId: string, serviceId: string): Promise<void> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { categoryId: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    const application = await this.prisma.onboardingApplication.findUnique({
      where: { providerId },
      select: {
        documents: {
          select: { categoryId: true, type: true, reviewStatus: true, expiresAt: true },
        },
      },
    });
    const documents = application?.documents ?? [];
    const now = Date.now();
    const validDocuments = documents.filter((document) =>
      document.reviewStatus === OnboardingDocumentReviewStatus.APPROVED &&
      (!document.expiresAt || document.expiresAt.getTime() > now),
    );
    const blockers = documents.filter((document) =>
      document.reviewStatus === OnboardingDocumentReviewStatus.REJECTED ||
      document.reviewStatus === OnboardingDocumentReviewStatus.EXPIRED ||
      (document.reviewStatus === OnboardingDocumentReviewStatus.APPROVED &&
        document.expiresAt && document.expiresAt.getTime() <= now),
    ).filter((document) => !validDocuments.some((valid) =>
      valid.type === document.type &&
      (document.categoryId === null
        ? valid.categoryId === null
        : valid.categoryId === null || valid.categoryId === document.categoryId),
    ));
    const blocked = blockers.some(
      (document) => document.categoryId === null || document.categoryId === service.categoryId,
    );
    if (blocked) {
      throw new ConflictException(
        'A rejected or expired compliance document affects this service category. Upload a renewal and wait for approval before listing it.',
      );
    }
  }

  private async assertNoDuplicateOffering(
    providerId: string,
    serviceId: string,
    variantId: string | null,
  ): Promise<void> {
    const existing = await this.prisma.providerOffering.findFirst({
      where: { providerId, serviceId, variantId },
    });
    if (existing) {
      throw new ConflictException(
        'An offering for this service/variant already exists — update it instead',
      );
    }
  }
}
