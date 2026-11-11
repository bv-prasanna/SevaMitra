import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { District } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StateService } from '../state/state.service';
import { CreateDistrictDto } from '../dto/create-district.dto';
import { UpdateDistrictDto } from '../dto/update-district.dto';

@Injectable()
export class DistrictService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateService: StateService,
  ) {}

  async create(dto: CreateDistrictDto): Promise<District> {
    await this.stateService.assertExistsOrThrow(dto.stateId);
    await this.assertNameFreeWithinState(dto.stateId, dto.name);

    return this.prisma.district.create({
      data: { stateId: dto.stateId, name: dto.name },
    });
  }

  findAll(stateId?: string): Promise<District[]> {
    return this.prisma.district.findMany({
      where: stateId ? { stateId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<District> {
    const district = await this.prisma.district.findUnique({ where: { id } });
    if (!district) {
      throw new NotFoundException('District not found');
    }
    return district;
  }

  async update(id: string, dto: UpdateDistrictDto): Promise<District> {
    const existing = await this.findOne(id);
    const targetStateId = dto.stateId ?? existing.stateId;
    if (dto.stateId) {
      await this.stateService.assertExistsOrThrow(dto.stateId);
    }
    if (dto.name) {
      await this.assertNameFreeWithinState(targetStateId, dto.name, id);
    }

    return this.prisma.district.update({
      where: { id },
      data: { stateId: dto.stateId, name: dto.name, isActive: dto.isActive },
    });
  }

  /** Used by TalukService to validate districtId on create/update. */
  async assertExistsOrThrow(id: string): Promise<void> {
    const district = await this.prisma.district.findUnique({ where: { id } });
    if (!district) {
      throw new NotFoundException('District not found');
    }
  }

  private async assertNameFreeWithinState(
    stateId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.district.findUnique({
      where: { stateId_name: { stateId, name } },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'A district with this name already exists in this state',
      );
    }
  }
}
