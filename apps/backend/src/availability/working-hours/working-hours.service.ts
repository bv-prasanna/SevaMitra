import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkingHours } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { isTimeBefore } from '../../common/util/time-of-day';
import { CreateWorkingHoursDto } from '../dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
  ) {}

  async create(
    userId: string,
    dto: CreateWorkingHoursDto,
  ): Promise<WorkingHours> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    this.assertOrdered(dto.startTime, dto.endTime);

    return this.prisma.workingHours.create({
      data: {
        providerId: provider.id,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async listOwn(userId: string): Promise<WorkingHours[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.workingHours.findMany({
      where: { providerId: provider.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateWorkingHoursDto,
  ): Promise<WorkingHours> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const existing = await this.getOwnedOrThrow(provider.id, id);
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    this.assertOrdered(startTime, endTime);

    return this.prisma.workingHours.update({
      where: { id },
      data: {
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    await this.getOwnedOrThrow(provider.id, id);
    await this.prisma.workingHours.delete({ where: { id } });
  }

  /** Internal — for AvailabilityCheckService to look up a provider's active hours for a specific day, without a userId in hand. */
  findActiveForDay(
    providerId: string,
    dayOfWeek: WorkingHours['dayOfWeek'],
  ): Promise<WorkingHours[]> {
    return this.prisma.workingHours.findMany({
      where: { providerId, dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' },
    });
  }

  private async getOwnedOrThrow(
    providerId: string,
    id: string,
  ): Promise<WorkingHours> {
    const entry = await this.prisma.workingHours.findUnique({ where: { id } });
    if (!entry || entry.providerId !== providerId) {
      throw new NotFoundException('Working hours entry not found');
    }
    return entry;
  }

  private assertOrdered(startTime: string, endTime: string): void {
    if (!isTimeBefore(startTime, endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }
  }
}
