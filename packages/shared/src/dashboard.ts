export type AgentId = 'claude' | 'codex' | 'opencode' | 'others';

export interface TokenBreakdown {
  input: number;
  cacheCreate: number;
  cacheRead: number;
  output: number;
}

export interface AgentUsage {
  id: AgentId;
  label: string;
  totalTokens: number;
  percent: number;
}

export interface DayUsage {
  date: string;
  label: string;
  totalTokens: number;
}

export interface DashboardSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  timezone: string;
  ccusageVersion: string;
  stale: boolean;
  refreshInProgress: boolean;
  error: string | null;
  nextRefreshAt: string | null;
  today: {
    date: string;
    totalTokens: number;
    totalTokensLabel: string;
    costUsd: number;
    costLabel: string;
    breakdown: TokenBreakdown;
    agents: AgentUsage[];
  };
  sevenDays: DayUsage[];
}
