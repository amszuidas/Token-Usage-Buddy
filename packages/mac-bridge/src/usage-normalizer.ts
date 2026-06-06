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
  const allRowsByDate = new Map(allRows.map((row) => [row.date, row]));
  const todayRow = allRowsByDate.get(input.today) ?? zeroRow(input.today);
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
    sevenDays: lastSevenDates(input.today).map((date) => {
      const row = allRowsByDate.get(date) ?? zeroRow(date);
      return {
        date,
        label: date === input.today ? 'Today' : weekdayLabel(date),
        totalTokens: row.totalTokens,
      };
    }),
  };
}

function readDailyRows(json: JsonObject) {
  const rows = Array.isArray(json.daily) ? json.daily : [];
  return rows
    .filter(isRecord)
    .map((row) => {
      const date = readString(row.period) ?? readString(row.date) ?? '';
      return {
        date,
        input: readNumber(row.inputTokens),
        cacheCreate: readNumber(row.cacheCreationTokens),
        cacheRead: readNumber(row.cacheReadTokens) + readNumber(row.cachedInputTokens),
        output: readNumber(row.outputTokens),
        totalTokens: readNumber(row.totalTokens),
        costUsd: readFiniteNumber(row.totalCost) ?? readFiniteNumber(row.costUSD) ?? 0,
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

function lastSevenDates(today: string): string[] {
  const start = new Date(`${today}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 6);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function weekdayLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number {
  return readFiniteNumber(value) ?? 0;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
