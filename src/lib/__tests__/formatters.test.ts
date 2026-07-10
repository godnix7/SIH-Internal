import { formatCoordinates, formatCountdown, formatDistance } from '../formatters';

describe('formatters', () => {
  it('formats countdowns without negative time', () => {
    expect(formatCountdown(5_000, 0)).toBe('0:05');
    expect(formatCountdown(0, 5_000)).toBe('0:00');
  });

  it('formats coordinates and distance for emergency UI', () => {
    expect(formatCoordinates(30.73512, 78.44291)).toBe('30.7351, 78.4429');
    expect(formatDistance(400)).toBe('400 m');
    expect(formatDistance(1250)).toBe('1.3 km');
  });
});
