import { homedir } from 'node:os';
import { join } from 'node:path';

export interface BridgeConfig {
  refreshIntervalMs: number;
  timezone: string;
  cachePath: string;
  maxConnectFailuresBeforeExit: number | null;
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv): BridgeConfig {
  const refreshMinutesText = env.TOKEN_BUDDY_REFRESH_MINUTES ?? '10';
  const refreshMinutes = /^\d+$/.test(refreshMinutesText) ? Number(refreshMinutesText) : NaN;
  const safeRefreshMinutes = Number.isSafeInteger(refreshMinutes) && refreshMinutes >= 1 ? refreshMinutes : 10;
  const maxFailuresText = env.TOKEN_BUDDY_MAX_CONNECT_FAILURES_BEFORE_EXIT ?? '';
  const maxFailures = /^\d+$/.test(maxFailuresText) ? Number(maxFailuresText) : NaN;
  const safeMaxFailures = Number.isSafeInteger(maxFailures) && maxFailures >= 1 ? maxFailures : null;
  return {
    refreshIntervalMs: safeRefreshMinutes * 60_000,
    timezone: env.TOKEN_BUDDY_TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    cachePath: env.TOKEN_BUDDY_CACHE_PATH ?? join(homedir(), '.token-usage-buddy-cache.json'),
    maxConnectFailuresBeforeExit: safeMaxFailures,
  };
}
