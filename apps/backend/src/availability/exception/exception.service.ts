import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityException, ExceptionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { isTimeBefore } from '../../common/util/time-of-day';
import { CreateExceptionDto } from '../dto/create-exception.dto';
import { UpdateExceptionDto } from '../dto/update-exception.dto';

@Injectable()
export class ExceptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
  ) {}

  async create(
    userId: string,
    dto: CreateExceptionDto,
  ): Promise<AvailabilityException> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    this.assertValid(
      dto.startDate,
      dto.endDate,
      dto.type,
      dto.customStartTime,
      dto.customEndTime,
    );

    return this.prisma.availabilityException.create({
      data: {
        providerId: provider.id,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        type: dto.type,
        customStartTime: dto.customStartTime,
        customEndTime: dto.customEndTime,
        reason: dto.reason,
      },
    });
  }

  async listOwn(userId: string): Promise<AvailabilityException[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.availabilityException.findMany({
      where: { providerId: provider.id },
      orderBy: { startDate: 'desc' },
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExceptionDto,
  ): Promise<AvailabilityException> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const existing = await this.getOwnedOrThrow(provider.id, id);

    const startDate =
      dto.startDate ?? existing.startDate.toISOString().slice(0, 10);
    const endDate = dto.endDate ?? existing.endDate.toISOString().slice(0, 10);
    const type = dto.type ?? existing.type;
    const customStartTime =
      dto.customStartTime ?? existing.customStartTime ?? undefined;
    const customEndTime =
      dto.customEndTime ?? existing.customEndTime ?? undefined;
    this.assertValid(startDate, endDate, type, customStartTime, customEndTime);

    return this.prisma.availabilityException.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        type: dto.type,
        customStartTime: dto.customStartTime,
        customEndTime: dto.customEndTime,
        reason: dto.reason,
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    await this.getOwnedOrThrow(provider.id, id);
    await this.prisma.availabilityException.delete({ where: { id } });
  }

  /** Internal — for AvailabilityCheckService to find any exception covering a specific date. */
  findCoveringDate(
    providerId: string,
    date: Date,
  ): Promise<AvailabilityException | null> {
    return this.prisma.availabilityException.findFirst({
      where: { providerId, startDate: { lte: date }, endDate: { gte: date } },
    });
  }

  private async getOwnedOrThrow(
    providerId: string,
    id: string,
  ): Promise<AvailabilityException> {
    const entry = await this.prisma.availabilityException.findUnique({
      where: { id },
    });
    if (!entry || entry.providerId !== providerId) {
      throw new NotFoundException('Availability exception not found');
    }
    return entry;
  }

  private assertValid(
    startDate: string,
    endDate: string,
    type: ExceptionType,
    customStartTime: string | undefined,
    customEndTime: string | undefined,
  ): void {
    if (startDate > endDate) {
      throw new BadRequestException('startDate must not be after endDate');
    }
    if (type === ExceptionType.CUSTOM_HOURS) {
      if (!customStartTime || !customEndTime) {
        throw new BadRequestException(
          'customStartTime and customEndTime are required when type=CUSTOM_HOURS',
        );
      }
      if (!isTimeBefore(customStartTime, customEndTime)) {
        throw new BadRequestException(
          'customStartTime must be before customEndTime',
        );
      }
    }
  }
}
