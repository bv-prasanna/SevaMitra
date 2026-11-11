import { isTimeBefore, TIME_OF_DAY_PATTERN } from './time-of-day';

describe('TIME_OF_DAY_PATTERN', () => {
  it.each(['00:00', '09:30', '23:59'])('accepts valid HH:mm %s', (value) => {
    expect(TIME_OF_DAY_PATTERN.test(value)).toBe(true);
  });

  it.each(['24:00', '9:30', '09:60', 'noon', '09:30:00'])(
    'rejects invalid value %s',
    (value) => {
      expect(TIME_OF_DAY_PATTERN.test(value)).toBe(false);
    },
  );
});

describe('isTimeBefore', () => {
  it('compares within the same hour', () => {
    expect(isTimeBefore('09:00', '09:30')).toBe(true);
    expect(isTimeBefore('09:30', '09:00')).toBe(false);
  });

  it('compares across hours', () => {
    expect(isTimeBefore('09:59', '10:00')).toBe(true);
  });

  it('is false for equal times', () => {
    expect(isTimeBefore('09:00', '09:00')).toBe(false);
  });
});
