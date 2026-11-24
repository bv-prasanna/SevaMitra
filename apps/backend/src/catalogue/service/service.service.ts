import { Injectable, NotFoundException } from '@nestjs/common';
import { Service, ServiceVariant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryService } from '../category/category.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoryService: CategoryService,
  ) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    await this.categoryService.assertExistsOrThrow(dto.categoryId);

    return this.prisma.service.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        exclusionsNote: dto.exclusionsNote,
        expectedDurationMinutes: dto.expectedDurationMinutes,
        customerPreparationNote: dto.customerPreparationNote,
        providerSkillNote: dto.providerSkillNote,
        tags: dto.tags ?? [],
      },
    });
  }

  findAll(categoryId?: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Service & { variants: ServiceVariant[] }> {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    await this.assertExistsOrThrow(id);
    if (dto.categoryId) {
      await this.categoryService.assertExistsOrThrow(dto.categoryId);
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        exclusionsNote: dto.exclusionsNote,
        expectedDurationMinutes: dto.expectedDurationMinutes,
        customerPreparationNote: dto.customerPreparationNote,
        providerSkillNote: dto.providerSkillNote,
        tags: dto.tags,
        isActive: dto.isActive,
      },
    });
  }

  /** Used by VariantService to validate serviceId on create/update. */
  async assertExistsOrThrow(id: string): Promise<void> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
  }
}
