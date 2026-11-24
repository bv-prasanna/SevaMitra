import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilitySchedule } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
  ) {}

  async create(
    userId: string,
    dto: CreateScheduleDto,
  ): Promise<AvailabilitySchedule> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);

    const existing = await this.prisma.availabilitySchedule.findUnique({
      where: { providerId: provider.id },
    });
    if (existing) {
      throw new ConflictException('Availability schedule already exists');
    }

    return this.prisma.availabilitySchedule.create({
      data: {
        providerId: provider.id,
        maxDailyBookings: dto.maxDailyBookings,
        maxConcurrentBookings: dto.maxConcurrentBookings,
      },
    });
  }

  async findOwn(userId: string): Promise<AvailabilitySchedule> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.getByProviderIdOrThrow(provider.id);
  }

  async update(
    userId: string,
    dto: UpdateScheduleDto,
  ): Promise<AvailabilitySchedule> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const existing = await this.getByProviderIdOrThrow(provider.id);

    return this.prisma.availabilitySchedule.update({
      where: { id: existing.id },
      data: {
        maxDailyBookings: dto.maxDailyBookings,
        maxConcurrentBookings: dto.maxConcurrentBookings,
      },
    });
  }

  private async getByProviderIdOrThrow(
    providerId: string,
  ): Promise<AvailabilitySchedule> {
    const schedule = await this.prisma.availabilitySchedule.findUnique({
      where: { providerId },
    });
    if (!schedule) {
      throw new NotFoundException(
        'Availability schedule not found — create one first (POST /availability/schedule/me)',
      );
    }
    return schedule;
  }
}
