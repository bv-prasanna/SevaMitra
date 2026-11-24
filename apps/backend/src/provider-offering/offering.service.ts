import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProviderOffering, ProviderStatus } from '@prisma/client';
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
    if (dto.serviceId) {
      await this.serviceService.assertExistsOrThrow(dto.serviceId);
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
    if (!offering) {
      throw new NotFoundException('Offering not found');
    }
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
