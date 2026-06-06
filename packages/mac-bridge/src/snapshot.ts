import type { DashboardSnapshot } from '@token-usage-buddy/shared';
import {
  type CcusageAgent,
  collectCcusageJson as defaultCollectCcusageJson,
  collectCcusageVersion as defaultCollectCcusageVersion,
} from './ccusage-runner.js';
import type { BridgeConfig } from './config.js';
import { addDaysToYmd, formatDateTimeOffset, formatDateYmd } from './date.js';
import { buildDashboardSnapshot } from './usage-normalizer.js';

type JsonObject = Record<string, unknown>;
type UsageAgent = Exclude<CcusageAgent, 'all'>;

export interface CollectDashboardSnapshotOptions {
  config: Pick<BridgeConfig, 'refreshIntervalMs' | 'timezone'>;
  now: () => Date;
  collectCcusageJson?: (agent: CcusageAgent, options: CollectUsageOptions) => Promise<JsonObject>;
  collectCcusageVersion?: () => Promise<string>;
}

interface CollectUsageOptions {
  since: string;
  until: string;
  timezone: string;
}

export async function collectDashboardSnapshot(options: CollectDashboardSnapshotOptions): Promise<DashboardSnapshot> {
  const generatedAtDate = options.now();
  const until = formatDateYmd(generatedAtDate, options.config.timezone);
  const since = addDaysToYmd(until, -6);
  const today = formatYmdForDashboard(until);
  const collectUsage = options.collectCcusageJson ?? defaultCollectCcusageJson;
  const collectVersion = options.collectCcusageVersion ?? defaultCollectCcusageVersion;
  const usageOptions = { since, until, timezone: options.config.timezone };

  const [allUsage, claudeUsage, codexUsage, opencodeUsage, ccusageVersion] = await Promise.all([
    collectUsage('all', usageOptions),
    collectUsage('claude', usageOptions),
    collectUsage('codex', usageOptions),
    collectUsage('opencode', usageOptions),
    collectVersion().catch(() => 'unknown'),
  ]);

  return buildDashboardSnapshot({
    allUsage,
    agentUsage: {
      claude: claudeUsage,
      codex: codexUsage,
      opencode: opencodeUsage,
    } satisfies Record<UsageAgent, JsonObject>,
    generatedAt: formatDateTimeOffset(generatedAtDate, options.config.timezone),
    timezone: options.config.timezone,
    ccusageVersion,
    today,
    nextRefreshAt: formatDateTimeOffset(
      new Date(generatedAtDate.getTime() + options.config.refreshIntervalMs),
      options.config.timezone,
    ),
    stale: false,
    refreshInProgress: false,
    error: null,
  });
}

function formatYmdForDashboard(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}
