/** 24-hour "HH:mm" wall-clock time, no date or timezone component. */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** String comparison is correct here only because both values are zero-padded "HH:mm". */
export function isTimeBefore(a: string, b: string): boolean {
  return a < b;
}
