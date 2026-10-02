import { Injectable } from '@nestjs/common';
import { DayOfWeek, ExceptionType } from '@prisma/client';
import { WorkingHoursService } from '../working-hours/working-hours.service';
import { ExceptionService } from '../exception/exception.service';

export interface Window {
  start: string;
  end: string;
}

export interface CheckResult {
  available: boolean;
  windows: Window[];
  reason:
    'WEEKLY_HOURS' | 'CUSTOM_HOURS' | 'EXCEPTION_UNAVAILABLE' | 'NO_SCHEDULE';
}

const UTC_DAY_INDEX: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

/**
 * Answers "when is this provider open on this date" — BRD §41's
 * "bookable slots" deliverable, minus actual booking subtraction (no
 * Booking module exists yet to subtract already-booked time from these
 * windows). See docs/modules/AVAILABILITY_IMPLEMENTATION.md §1.
 */
@Injectable()
export class AvailabilityCheckService {
  constructor(
    private readonly workingHoursService: WorkingHoursService,
    private readonly exceptionService: ExceptionService,
  ) {}

  async getAvailability(
    providerId: string,
    dateString: string,
  ): Promise<CheckResult> {
    const date = new Date(dateString);

    const exception = await this.exceptionService.findCoveringDate(
      providerId,
      date,
    );
    if (exception) {
      if (exception.type === ExceptionType.UNAVAILABLE) {
        return {
          available: false,
          windows: [],
          reason: 'EXCEPTION_UNAVAILABLE',
        };
      }
      return {
        available: true,
        windows: [
          { start: exception.customStartTime!, end: exception.customEndTime! },
        ],
        reason: 'CUSTOM_HOURS',
      };
    }

    const dayOfWeek = UTC_DAY_INDEX[date.getUTCDay()];
    const hours = await this.workingHoursService.findActiveForDay(
      providerId,
      dayOfWeek,
    );
    if (hours.length === 0) {
      return { available: false, windows: [], reason: 'NO_SCHEDULE' };
    }

    return {
      available: true,
      windows: hours.map((h) => ({ start: h.startTime, end: h.endTime })),
      reason: 'WEEKLY_HOURS',
    };
  }
}
