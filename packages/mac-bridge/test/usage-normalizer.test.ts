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
});
