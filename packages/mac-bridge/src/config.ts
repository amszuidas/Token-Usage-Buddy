import { homedir } from 'node:os';
import { join } from 'node:path';

export interface BridgeConfig {
  refreshIntervalMs: number;
  timezone: string;
  cachePath: string;
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv): BridgeConfig {
  const refreshMinutes = Number.parseInt(env.TOKEN_BUDDY_REFRESH_MINUTES ?? '10', 10);
  const safeRefreshMinutes = Number.isFinite(refreshMinutes) && refreshMinutes >= 1 ? refreshMinutes : 10;
  return {
    refreshIntervalMs: safeRefreshMinutes * 60_000,
    timezone: env.TOKEN_BUDDY_TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    cachePath: env.TOKEN_BUDDY_CACHE_PATH ?? join(homedir(), '.token-usage-buddy-cache.json'),
  };
}
