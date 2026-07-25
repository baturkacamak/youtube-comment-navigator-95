import { getAdaptiveCommentMonitorIntervalMinutes } from './commentMonitorService';

describe('commentMonitorService', () => {
  const now = Date.parse('2026-01-31T00:00:00Z');

  it('uses a 15 minute interval during the first day after publication', () => {
    expect(
      getAdaptiveCommentMonitorIntervalMinutes(
        '2026-01-30T12:00:00Z',
        now - 12 * 60 * 60 * 1000,
        now
      )
    ).toBe(15);
  });

  it('uses a 30 minute interval during the first week after publication', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes('2026-01-28T00:00:00Z', now, now)).toBe(30);
  });

  it('uses a 3 hour interval during the first month after publication', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes('2026-01-15T00:00:00Z', now, now)).toBe(180);
  });

  it('uses a 12 hour interval for older videos', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes('2025-12-01T00:00:00Z', now, now)).toBe(720);
  });

  it('falls back to tracking age when publication date is unavailable', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes(null, now - 2 * 60 * 60 * 1000, now)).toBe(15);
  });
});
