import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { State } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStateDto } from '../dto/create-state.dto';
import { UpdateStateDto } from '../dto/update-state.dto';

@Injectable()
export class StateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStateDto): Promise<State> {
    const existing = await this.prisma.state.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A state with this name already exists');
    }

    return this.prisma.state.create({
      data: { name: dto.name, code: dto.code },
    });
  }

  findAll(): Promise<State[]> {
    return this.prisma.state.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<State> {
    const state = await this.prisma.state.findUnique({ where: { id } });
    if (!state) {
      throw new NotFoundException('State not found');
    }
    return state;
  }

  async update(id: string, dto: UpdateStateDto): Promise<State> {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.state.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A state with this name already exists');
      }
    }

    return this.prisma.state.update({
      where: { id },
      data: { name: dto.name, code: dto.code, isActive: dto.isActive },
    });
  }

  /** Used by DistrictService to validate stateId on create/update. */
  async assertExistsOrThrow(id: string): Promise<void> {
    const state = await this.prisma.state.findUnique({ where: { id } });
    if (!state) {
      throw new NotFoundException('State not found');
    }
  }
}
