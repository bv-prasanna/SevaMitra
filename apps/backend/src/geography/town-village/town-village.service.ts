import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TownVillage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TalukService } from '../taluk/taluk.service';
import { CreateTownVillageDto } from '../dto/create-town-village.dto';
import { UpdateTownVillageDto } from '../dto/update-town-village.dto';

@Injectable()
export class TownVillageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly talukService: TalukService,
  ) {}

  async create(
    talukId: string,
    dto: CreateTownVillageDto,
  ): Promise<TownVillage> {
    await this.talukService.assertExistsOrThrow(talukId);
    await this.assertNameFreeWithinTaluk(talukId, dto.name);

    return this.prisma.townVillage.create({
      data: {
        talukId,
        name: dto.name,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async list(talukId: string): Promise<TownVillage[]> {
    await this.talukService.assertExistsOrThrow(talukId);
    return this.prisma.townVillage.findMany({
      where: { talukId },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    talukId: string,
    id: string,
    dto: UpdateTownVillageDto,
  ): Promise<TownVillage> {
    await this.getOwnedTownVillageOrThrow(talukId, id);
    if (dto.name) {
      await this.assertNameFreeWithinTaluk(talukId, dto.name, id);
    }

    return this.prisma.townVillage.update({
      where: { id },
      data: {
        name: dto.name,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isActive: dto.isActive,
      },
    });
  }

  /** Internal — flat, taluk-agnostic existence check for modules (Serviceability) that hold only a townVillageId. */
  async findByIdOrThrow(id: string): Promise<TownVillage> {
    const townVillage = await this.prisma.townVillage.findUnique({
      where: { id },
    });
    if (!townVillage) {
      throw new NotFoundException('Town/village not found');
    }
    return townVillage;
  }

  private async getOwnedTownVillageOrThrow(
    talukId: string,
    id: string,
  ): Promise<TownVillage> {
    const townVillage = await this.prisma.townVillage.findUnique({
      where: { id },
    });
    if (!townVillage || townVillage.talukId !== talukId) {
      throw new NotFoundException('Town/village not found');
    }
    return townVillage;
  }

  private async assertNameFreeWithinTaluk(
    talukId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.townVillage.findUnique({
      where: { talukId_name: { talukId, name } },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'A town/village with this name already exists in this taluk',
      );
    }
  }
}
