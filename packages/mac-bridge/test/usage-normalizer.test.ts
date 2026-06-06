import { describe, expect, it } from 'vitest';
import { buildDashboardSnapshot } from '../src/usage-normalizer.js';

const allUsage = {
  daily: [
    {
      period: '2026-06-05',
      inputTokens: 100,
      cacheCreationTokens: 200,
      cacheReadTokens: 300,
      outputTokens: 400,
      totalTokens: 1_000,
      totalCost: 0.5,
    },
    {
      period: '2026-06-06',
      inputTokens: 1_000,
      cacheCreationTokens: 2_000,
      cacheReadTokens: 3_000,
      outputTokens: 4_000,
      totalTokens: 10_000,
      totalCost: 2.5,
    },
  ],
};

const claudeUsage = { daily: [{ date: '2026-06-06', totalTokens: 4_000 }] };
const codexUsage = { daily: [{ date: '2026-06-06', totalTokens: 3_000 }] };
const opencodeUsage = { daily: [{ date: '2026-06-06', totalTokens: 2_000 }] };

describe('buildDashboardSnapshot', () => {
  it('uses all-agent totals and computes Others from known agents', () => {
    const snapshot = buildDashboardSnapshot({
      allUsage,
      agentUsage: {
        claude: claudeUsage,
        codex: codexUsage,
        opencode: opencodeUsage,
      },
      generatedAt: '2026-06-06T14:20:00.000+08:00',
      timezone: 'Asia/Shanghai',
      ccusageVersion: '20.0.6',
      today: '2026-06-06',
      nextRefreshAt: '2026-06-06T14:30:00.000+08:00',
      stale: false,
      refreshInProgress: false,
      error: null,
    });

    expect(snapshot.today.totalTokens).toBe(10_000);
    expect(snapshot.today.totalTokensLabel).toBe('10.0K');
    expect(snapshot.today.costLabel).toBe('$2.50');
    expect(snapshot.today.breakdown).toEqual({
      input: 1_000,
      cacheCreate: 2_000,
      cacheRead: 3_000,
      output: 4_000,
    });
    expect(snapshot.today.agents.map((agent) => [agent.id, agent.totalTokens, agent.percent])).toEqual([
      ['claude', 4_000, 40],
      ['codex', 3_000, 30],
      ['opencode', 2_000, 20],
      ['others', 1_000, 10],
    ]);
  });

  it('fills missing days to always emit seven calendar days ending today', () => {
    const snapshot = buildSnapshot({
      allUsage: {
        daily: [
          { period: '2026-06-01', totalTokens: 1_000 },
          { period: '2026-06-06', totalTokens: 6_000 },
        ],
      },
    });

    expect(snapshot.sevenDays).toHaveLength(7);
    expect(snapshot.sevenDays).toEqual([
      { date: '2026-05-31', label: 'Sun', totalTokens: 0 },
      { date: '2026-06-01', label: 'Mon', totalTokens: 1_000 },
      { date: '2026-06-02', label: 'Tue', totalTokens: 0 },
      { date: '2026-06-03', label: 'Wed', totalTokens: 0 },
      { date: '2026-06-04', label: 'Thu', totalTokens: 0 },
      { date: '2026-06-05', label: 'Fri', totalTokens: 0 },
      { date: '2026-06-06', label: 'Today', totalTokens: 6_000 },
    ]);
  });

  it('preserves zero totalCost instead of falling back to costUSD', () => {
    const snapshot = buildSnapshot({
      allUsage: {
        daily: [{ period: '2026-06-06', totalTokens: 500, totalCost: 0, costUSD: 99 }],
      },
    });

    expect(snapshot.today.costUsd).toBe(0);
    expect(snapshot.today.costLabel).toBe('$0.00');
  });

  it('ignores malformed daily rows', () => {
    const snapshot = buildSnapshot({
      allUsage: {
        daily: [null, 'bad row', 42, {}, { period: '2026-06-06', totalTokens: 123 }],
      },
    });

    expect(snapshot.today.totalTokens).toBe(123);
  });

  it('reads Codex-style cachedInputTokens and costUSD when totalCost is absent', () => {
    const snapshot = buildSnapshot({
      allUsage: {
        daily: [{ date: '2026-06-06', cachedInputTokens: 750, totalTokens: 2_500, costUSD: 1.25 }],
      },
    });

    expect(snapshot.today.breakdown.cacheRead).toBe(750);
    expect(snapshot.today.costUsd).toBe(1.25);
    expect(snapshot.today.costLabel).toBe('$1.25');
  });

  it('clamps Others to zero when known agent totals exceed all-agent total', () => {
    const snapshot = buildSnapshot({
      allUsage: {
        daily: [{ period: '2026-06-06', totalTokens: 1_000 }],
      },
      agentUsage: {
        claude: { daily: [{ date: '2026-06-06', totalTokens: 900 }] },
        codex: { daily: [{ date: '2026-06-06', totalTokens: 800 }] },
        opencode: { daily: [{ date: '2026-06-06', totalTokens: 700 }] },
      },
    });

    expect(snapshot.today.agents.find((agent) => agent.id === 'others')?.totalTokens).toBe(0);
  });
});

function buildSnapshot(
  overrides: Partial<Parameters<typeof buildDashboardSnapshot>[0]> = {},
): ReturnType<typeof buildDashboardSnapshot> {
  return buildDashboardSnapshot({
    allUsage: { daily: [] },
    agentUsage: {
      claude: { daily: [] },
      codex: { daily: [] },
      opencode: { daily: [] },
    },
    generatedAt: '2026-06-06T14:20:00.000+08:00',
    timezone: 'Asia/Shanghai',
    ccusageVersion: '20.0.6',
    today: '2026-06-06',
    nextRefreshAt: '2026-06-06T14:30:00.000+08:00',
    stale: false,
    refreshInProgress: false,
    error: null,
    ...overrides,
  });
}
