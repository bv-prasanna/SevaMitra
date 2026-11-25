import { addBusinessMinutes } from './sla-calendar';

const weekdayPolicy = {
  businessHoursOnly: true,
  businessStartMinute: 9 * 60,
  businessEndMinute: 17 * 60,
  workingDays: [1, 2, 3, 4, 5],
  timezone: 'Asia/Kolkata',
};

describe('addBusinessMinutes', () => {
  it('moves an after-hours deadline to the next business day', () => {
    const fridayAfterHours = new Date('2026-11-27T12:00:00.000Z'); // 17:30 IST
    expect(addBusinessMinutes(fridayAfterHours, 60, weekdayPolicy).toISOString())
      .toBe('2026-11-30T04:30:00.000Z'); // Monday 10:00 IST
  });

  it('carries remaining minutes over a weekend', () => {
    const friday = new Date('2026-11-27T11:30:00.000Z'); // 17:00 IST
    expect(addBusinessMinutes(friday, 30, weekdayPolicy).toISOString())
      .toBe('2026-11-30T04:00:00.000Z'); // Monday 09:30 IST
  });

  it('skips configured public holidays', () => {
    const friday = new Date('2026-11-27T11:30:00.000Z');
    const holidays = new Set(['2026-11-30']);
    expect(addBusinessMinutes(friday, 30, weekdayPolicy, holidays).toISOString())
      .toBe('2026-12-01T04:00:00.000Z'); // Tuesday 09:30 IST
  });

  it('uses elapsed minutes when the approved policy is not business-hours-only', () => {
    expect(addBusinessMinutes(
      new Date('2026-11-28T00:00:00.000Z'),
      90,
      { ...weekdayPolicy, businessHoursOnly: false },
    ).toISOString()).toBe('2026-11-28T01:30:00.000Z');
  });

  it('rejects invalid calendar and minute input', () => {
    expect(() => addBusinessMinutes(new Date(), -1, weekdayPolicy)).toThrow(RangeError);
    expect(() => addBusinessMinutes(new Date(), 1, { ...weekdayPolicy, timezone: 'Mars/Olympus' })).toThrow(RangeError);
  });
});
