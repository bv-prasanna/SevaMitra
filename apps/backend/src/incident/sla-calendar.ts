export interface BusinessCalendarPolicy {
  businessHoursOnly: boolean;
  businessStartMinute: number;
  businessEndMinute: number;
  workingDays: number[];
  timezone: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function localCalendarParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${value.year}-${value.month}-${value.day}`,
    weekday: WEEKDAY_INDEX[value.weekday ?? ''],
    minuteOfDay: Number(value.hour) * 60 + Number(value.minute),
  };
}

/**
 * Adds elapsed minutes inside an approved business calendar. The function
 * walks actual instants and derives the local calendar in the policy timezone,
 * so weekends, holidays and timezone/DST boundaries are not guessed from the
 * server's local timezone.
 */
export function addBusinessMinutes(
  start: Date,
  minutes: number,
  policy: BusinessCalendarPolicy,
  holidays: ReadonlySet<string> = new Set(),
): Date {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new RangeError('SLA minutes must be a non-negative integer');
  }
  if (!Number.isFinite(start.getTime())) throw new RangeError('Invalid start date');
  if (!policy.businessHoursOnly || minutes === 0) {
    return new Date(start.getTime() + (policy.businessHoursOnly ? 0 : minutes * 60_000));
  }
  if (
    !Number.isInteger(policy.businessStartMinute) ||
    !Number.isInteger(policy.businessEndMinute) ||
    policy.businessStartMinute < 0 ||
    policy.businessEndMinute > 1440 ||
    policy.businessStartMinute >= policy.businessEndMinute ||
    policy.workingDays.length === 0 ||
    policy.workingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new RangeError('Invalid business calendar policy');
  }

  // Validate the timezone before entering the loop, including for an
  // otherwise-valid calendar that happens to have no eligible day soon.
  new Intl.DateTimeFormat('en-US', { timeZone: policy.timezone }).format(start);
  const workingDays = new Set(policy.workingDays);
  let cursor = new Date(start.getTime());
  let remaining = minutes;
  let iterations = 0;
  const maxIterations = 5_000_000;

  while (remaining > 0) {
    const local = localCalendarParts(cursor, policy.timezone);
    if (
      workingDays.has(local.weekday) &&
      !holidays.has(local.dateKey) &&
      local.minuteOfDay >= policy.businessStartMinute &&
      local.minuteOfDay < policy.businessEndMinute
    ) {
      remaining -= 1;
    }
    cursor = new Date(cursor.getTime() + 60_000);
    iterations += 1;
    if (iterations > maxIterations) {
      throw new RangeError('SLA calendar exceeds the supported calculation horizon');
    }
  }
  return cursor;
}
