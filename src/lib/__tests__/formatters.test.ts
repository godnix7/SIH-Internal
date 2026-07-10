import { formatCoordinates, formatCountdown, formatDistance, tierLabel } from '../formatters';

describe('formatters', () => {
  it('names every consent tier in the words the consent screen uses', () => {
    expect(tierLabel('off')).toBe('Off');
    expect(tierLabel('checkins')).toBe('Check-ins only');
    expect(tierLabel('zones')).toBe('Zone alerts');
    expect(tierLabel('full')).toBe('Full monitoring');
  });

  it('formats countdowns without negative time', () => {
    expect(formatCountdown(5_000, 0)).toBe('0:05');
    expect(formatCountdown(0, 5_000)).toBe('0:00');
  });

  it('rolls a multi-hour check-in into hours rather than 236 minutes', () => {
    expect(formatCountdown(4 * 60 * 60_000, 0)).toBe('4:00:00');
    expect(formatCountdown(3 * 60 * 60_000 + 56 * 60_000 + 2_000, 0)).toBe('3:56:02');
    expect(formatCountdown(59 * 60_000 + 59_000, 0)).toBe('59:59');
  });

  it('formats coordinates and distance for emergency UI', () => {
    expect(formatCoordinates(30.73512, 78.44291)).toBe('30.7351, 78.4429');
    expect(formatDistance(400)).toBe('400 m');
    expect(formatDistance(1250)).toBe('1.3 km');
  });
});
