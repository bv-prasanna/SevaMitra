import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<ServiceCategory> {
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    return this.prisma.serviceCategory.create({
      data: { name: dto.name, description: dto.description },
    });
  }

  findAll(): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<ServiceCategory> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<ServiceCategory> {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.serviceCategory.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A category with this name already exists');
      }
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  /** Used by ServiceService to validate categoryId on create/update. */
  async assertExistsOrThrow(id: string): Promise<void> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}
