import { describe, expect, it, vi } from 'vitest';
import { collectDashboardSnapshot } from '../src/snapshot.js';

describe('collectDashboardSnapshot', () => {
  it('uses unknown ccusage version when version lookup fails', async () => {
    const collectCcusageJson = vi.fn().mockResolvedValue({
      daily: [{ period: '2026-03-09', totalTokens: 1_000 }],
    });
    const collectCcusageVersion = vi.fn().mockRejectedValue(new Error('version failed'));

    const snapshot = await collectDashboardSnapshot({
      config: {
        refreshIntervalMs: 600_000,
        timezone: 'America/New_York',
      },
      collectCcusageJson,
      collectCcusageVersion,
      now: () => new Date('2026-03-09T04:30:00.000Z'),
    });

    expect(snapshot.ccusageVersion).toBe('unknown');
    expect(snapshot.today.date).toBe('2026-03-09');
    expect(collectCcusageJson).toHaveBeenCalledWith('all', {
      since: '20260303',
      until: '20260309',
      timezone: 'America/New_York',
    });
  });
});
