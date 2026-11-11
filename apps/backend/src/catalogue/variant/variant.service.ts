import { Injectable, NotFoundException } from '@nestjs/common';
import { ServiceVariant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceService } from '../service/service.service';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';

@Injectable()
export class VariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceService: ServiceService,
  ) {}

  async create(
    serviceId: string,
    dto: CreateVariantDto,
  ): Promise<ServiceVariant> {
    await this.serviceService.assertExistsOrThrow(serviceId);

    return this.prisma.serviceVariant.create({
      data: { serviceId, name: dto.name, description: dto.description },
    });
  }

  async list(serviceId: string): Promise<ServiceVariant[]> {
    await this.serviceService.assertExistsOrThrow(serviceId);
    return this.prisma.serviceVariant.findMany({
      where: { serviceId },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    serviceId: string,
    id: string,
    dto: UpdateVariantDto,
  ): Promise<ServiceVariant> {
    await this.getOwnedVariantOrThrow(serviceId, id);

    return this.prisma.serviceVariant.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  /** Internal — for modules (Provider Offering) that hold a bare variantId and need to confirm it belongs to a specific service. */
  async assertBelongsToService(
    serviceId: string,
    variantId: string,
  ): Promise<void> {
    await this.getOwnedVariantOrThrow(serviceId, variantId);
  }

  private async getOwnedVariantOrThrow(
    serviceId: string,
    id: string,
  ): Promise<ServiceVariant> {
    const variant = await this.prisma.serviceVariant.findUnique({
      where: { id },
    });
    if (!variant || variant.serviceId !== serviceId) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }
}
