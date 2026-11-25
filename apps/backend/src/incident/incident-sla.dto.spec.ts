import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IncidentSeverity } from '@prisma/client';
import { CreateIncidentSlaHolidayDto, CreateIncidentSlaPolicyDto } from './incident-sla.dto';

describe('incident SLA request validation', () => {
  const validPolicy = {
    name: 'P2 weekday support',
    severity: IncidentSeverity.P2,
    category: 'SERVICE_ISSUE',
    acknowledgeMinutes: 30,
    level1Minutes: 60,
    level2Minutes: 60,
    level3Minutes: 60,
    businessHoursOnly: true,
    businessStartMinute: 540,
    businessEndMinute: 1020,
    workingDays: [1, 2, 3, 4, 5],
    timezone: 'Asia/Kolkata',
  };

  it('accepts a complete business-approved policy definition', async () => {
    expect(await validate(plainToInstance(CreateIncidentSlaPolicyDto, validPolicy))).toHaveLength(0);
  });

  it('rejects invalid severity, negative targets, duplicate weekdays and malformed timezone text', async () => {
    const invalid = plainToInstance(CreateIncidentSlaPolicyDto, {
      ...validPolicy,
      severity: 'URGENT',
      acknowledgeMinutes: 0,
      workingDays: [1, 1, 8],
      timezone: ' ',
    });
    expect((await validate(invalid)).length).toBeGreaterThanOrEqual(4);
  });

  it('validates a holiday date and label', async () => {
    expect(await validate(plainToInstance(CreateIncidentSlaHolidayDto, {
      date: '2026-12-25', label: 'Public holiday',
    }))).toHaveLength(0);
    expect((await validate(plainToInstance(CreateIncidentSlaHolidayDto, {
      date: 'not-a-date', label: ' ',
    }))).length).toBeGreaterThan(0);
  });
});
