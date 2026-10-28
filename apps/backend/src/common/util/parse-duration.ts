const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/** Parses simple durations like "15m", "30d", "3600s" into seconds. */
export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${value}" — expected a number followed by s/m/h/d, e.g. "15m"`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_SECONDS[unit];
}
