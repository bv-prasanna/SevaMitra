import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Taluk } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DistrictService } from '../district/district.service';
import { CreateTalukDto } from '../dto/create-taluk.dto';
import { UpdateTalukDto } from '../dto/update-taluk.dto';

@Injectable()
export class TalukService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly districtService: DistrictService,
  ) {}

  async create(dto: CreateTalukDto): Promise<Taluk> {
    await this.districtService.assertExistsOrThrow(dto.districtId);
    await this.assertNameFreeWithinDistrict(dto.districtId, dto.name);

    return this.prisma.taluk.create({
      data: { districtId: dto.districtId, name: dto.name },
    });
  }

  findAll(districtId?: string): Promise<Taluk[]> {
    return this.prisma.taluk.findMany({
      where: districtId ? { districtId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Taluk> {
    const taluk = await this.prisma.taluk.findUnique({ where: { id } });
    if (!taluk) {
      throw new NotFoundException('Taluk not found');
    }
    return taluk;
  }

  async update(id: string, dto: UpdateTalukDto): Promise<Taluk> {
    const existing = await this.findOne(id);
    const targetDistrictId = dto.districtId ?? existing.districtId;
    if (dto.districtId) {
      await this.districtService.assertExistsOrThrow(dto.districtId);
    }
    if (dto.name) {
      await this.assertNameFreeWithinDistrict(targetDistrictId, dto.name, id);
    }

    return this.prisma.taluk.update({
      where: { id },
      data: {
        districtId: dto.districtId,
        name: dto.name,
        isActive: dto.isActive,
      },
    });
  }

  /** Used by TownVillageService to validate talukId on create/update. */
  async assertExistsOrThrow(id: string): Promise<void> {
    const taluk = await this.prisma.taluk.findUnique({ where: { id } });
    if (!taluk) {
      throw new NotFoundException('Taluk not found');
    }
  }

  private async assertNameFreeWithinDistrict(
    districtId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.taluk.findUnique({
      where: { districtId_name: { districtId, name } },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'A taluk with this name already exists in this district',
      );
    }
  }
}
