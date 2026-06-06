import type { AgentId, DashboardSnapshot } from '@token-usage-buddy/shared';
import { formatEngineeringTokens, formatUsd } from '@token-usage-buddy/shared';

type JsonObject = Record<string, unknown>;

interface BuildDashboardInput {
  allUsage: JsonObject;
  agentUsage: Record<Exclude<AgentId, 'others'>, JsonObject>;
  generatedAt: string;
  timezone: string;
  ccusageVersion: string;
  today: string;
  nextRefreshAt: string | null;
  stale: boolean;
  refreshInProgress: boolean;
  error: string | null;
}

const AGENT_LABELS: Record<AgentId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  opencode: 'OpenCode',
  others: 'Others',
};

export function buildDashboardSnapshot(input: BuildDashboardInput): DashboardSnapshot {
  const allRows = readDailyRows(input.allUsage);
  const todayRow = allRows.find((row) => row.date === input.today) ?? zeroRow(input.today);
  const knownAgentTotals: Record<Exclude<AgentId, 'others'>, number> = {
    claude: readAgentTotal(input.agentUsage.claude, input.today),
    codex: readAgentTotal(input.agentUsage.codex, input.today),
    opencode: readAgentTotal(input.agentUsage.opencode, input.today),
  };
  const knownTotal = knownAgentTotals.claude + knownAgentTotals.codex + knownAgentTotals.opencode;
  const othersTotal = Math.max(todayRow.totalTokens - knownTotal, 0);
  const agentTotals: Record<AgentId, number> = {
    ...knownAgentTotals,
    others: othersTotal,
  };

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    timezone: input.timezone,
    ccusageVersion: input.ccusageVersion,
    stale: input.stale,
    refreshInProgress: input.refreshInProgress,
    error: input.error,
    nextRefreshAt: input.nextRefreshAt,
    today: {
      date: input.today,
      totalTokens: todayRow.totalTokens,
      totalTokensLabel: formatEngineeringTokens(todayRow.totalTokens),
      costUsd: todayRow.costUsd,
      costLabel: formatUsd(todayRow.costUsd),
      breakdown: {
        input: todayRow.input,
        cacheCreate: todayRow.cacheCreate,
        cacheRead: todayRow.cacheRead,
        output: todayRow.output,
      },
      agents: (['claude', 'codex', 'opencode', 'others'] as AgentId[]).map((id) => ({
        id,
        label: AGENT_LABELS[id],
        totalTokens: agentTotals[id],
        percent: todayRow.totalTokens === 0 ? 0 : Math.round((agentTotals[id] / todayRow.totalTokens) * 1000) / 10,
      })),
    },
    sevenDays: allRows.map((row) => ({
      date: row.date,
      label: row.date === input.today ? 'Today' : weekdayLabel(row.date),
      totalTokens: row.totalTokens,
    })),
  };
}

function readDailyRows(json: JsonObject) {
  const rows = Array.isArray(json.daily) ? json.daily : [];
  return rows
    .map((row) => {
      const record = row as JsonObject;
      const date = readString(record.period) ?? readString(record.date) ?? '';
      return {
        date,
        input: readNumber(record.inputTokens),
        cacheCreate: readNumber(record.cacheCreationTokens),
        cacheRead: readNumber(record.cacheReadTokens) + readNumber(record.cachedInputTokens),
        output: readNumber(record.outputTokens),
        totalTokens: readNumber(record.totalTokens),
        costUsd: readNumber(record.totalCost) || readNumber(record.costUSD),
      };
    })
    .filter((row) => row.date.length > 0);
}

function readAgentTotal(json: JsonObject, today: string): number {
  const row = readDailyRows(json).find((candidate) => candidate.date === today);
  return row?.totalTokens ?? 0;
}

function zeroRow(date: string) {
  return { date, input: 0, cacheCreate: 0, cacheRead: 0, output: 0, totalTokens: 0, costUsd: 0 };
}

function weekdayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
