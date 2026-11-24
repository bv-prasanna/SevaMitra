import { DayOfWeek, ExceptionType } from '@prisma/client';
import { AvailabilityCheckService } from './availability-check.service';
import type { WorkingHoursService } from '../working-hours/working-hours.service';
import type { ExceptionService } from '../exception/exception.service';

describe('AvailabilityCheckService', () => {
  let workingHoursService: { findActiveForDay: jest.Mock };
  let exceptionService: { findCoveringDate: jest.Mock };
  let service: AvailabilityCheckService;

  beforeEach(() => {
    workingHoursService = { findActiveForDay: jest.fn() };
    exceptionService = { findCoveringDate: jest.fn() };
    service = new AvailabilityCheckService(
      workingHoursService as unknown as WorkingHoursService,
      exceptionService as unknown as ExceptionService,
    );
  });

  it('returns EXCEPTION_UNAVAILABLE without checking weekly hours', async () => {
    exceptionService.findCoveringDate.mockResolvedValue({
      type: ExceptionType.UNAVAILABLE,
    });

    const result = await service.getAvailability('provider-1', '2026-10-20');

    expect(result).toEqual({
      available: false,
      windows: [],
      reason: 'EXCEPTION_UNAVAILABLE',
    });
    expect(workingHoursService.findActiveForDay).not.toHaveBeenCalled();
  });

  it('returns CUSTOM_HOURS window when an exception overrides with custom hours', async () => {
    exceptionService.findCoveringDate.mockResolvedValue({
      type: ExceptionType.CUSTOM_HOURS,
      customStartTime: '10:00',
      customEndTime: '14:00',
    });

    const result = await service.getAvailability('provider-1', '2026-10-20');

    expect(result).toEqual({
      available: true,
      windows: [{ start: '10:00', end: '14:00' }],
      reason: 'CUSTOM_HOURS',
    });
  });

  it('falls back to weekly hours when no exception covers the date', async () => {
    exceptionService.findCoveringDate.mockResolvedValue(null);
    // 2026-10-20 is a Tuesday
    workingHoursService.findActiveForDay.mockResolvedValue([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '15:00', endTime: '18:00' },
    ]);

    const result = await service.getAvailability('provider-1', '2026-10-20');

    expect(workingHoursService.findActiveForDay).toHaveBeenCalledWith(
      'provider-1',
      DayOfWeek.TUESDAY,
    );
    expect(result).toEqual({
      available: true,
      windows: [
        { start: '09:00', end: '13:00' },
        { start: '15:00', end: '18:00' },
      ],
      reason: 'WEEKLY_HOURS',
    });
  });

  it('returns NO_SCHEDULE when neither an exception nor weekly hours exist', async () => {
    exceptionService.findCoveringDate.mockResolvedValue(null);
    workingHoursService.findActiveForDay.mockResolvedValue([]);

    const result = await service.getAvailability('provider-1', '2026-10-20');

    expect(result).toEqual({
      available: false,
      windows: [],
      reason: 'NO_SCHEDULE',
    });
  });

  it('resolves the correct day of week across the full range', async () => {
    exceptionService.findCoveringDate.mockResolvedValue(null);
    workingHoursService.findActiveForDay.mockResolvedValue([]);

    // 2026-10-18 is a Sunday
    await service.getAvailability('provider-1', '2026-10-18');
    expect(workingHoursService.findActiveForDay).toHaveBeenLastCalledWith(
      'provider-1',
      DayOfWeek.SUNDAY,
    );

    // 2026-10-24 is a Saturday
    await service.getAvailability('provider-1', '2026-10-24');
    expect(workingHoursService.findActiveForDay).toHaveBeenLastCalledWith(
      'provider-1',
      DayOfWeek.SATURDAY,
    );
  });
});
