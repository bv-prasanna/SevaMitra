import { haversineDistanceKm } from './haversine';

describe('haversineDistanceKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineDistanceKm(12.2958, 76.6394, 12.2958, 76.6394)).toBeCloseTo(
      0,
      6,
    );
  });

  it('returns a known distance between Mysuru and Bengaluru (~120-135km)', () => {
    // Mysuru: 12.2958, 76.6394 — Bengaluru: 12.9716, 77.5946
    const distance = haversineDistanceKm(12.2958, 76.6394, 12.9716, 77.5946);
    expect(distance).toBeGreaterThan(120);
    expect(distance).toBeLessThan(135);
  });

  it('is symmetric', () => {
    const a = haversineDistanceKm(12.2958, 76.6394, 12.1188, 76.6817);
    const b = haversineDistanceKm(12.1188, 76.6817, 12.2958, 76.6394);
    expect(a).toBeCloseTo(b, 9);
  });
});
