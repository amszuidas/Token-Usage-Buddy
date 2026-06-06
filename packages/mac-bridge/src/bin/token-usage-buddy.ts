#!/usr/bin/env node

import { readCachedSnapshot, writeCachedSnapshot } from '../cache.js';
import { collectCcusageJson, collectCcusageVersion } from '../ccusage-runner.js';
import { loadConfigFromEnv } from '../config.js';
import { createBleClient } from '../ble-client.js';
import { createBridgeController } from '../controller.js';
import { addDays, formatDateYmd } from '../date.js';
import { createRefreshScheduler } from '../scheduler.js';
import { buildDashboardSnapshot } from '../usage-normalizer.js';

const config = loadConfigFromEnv(process.env);
const ble = createBleClient();

await ble.connect();

const controller = createBridgeController({
  config,
  ble,
  readCache: () => readCachedSnapshot(config.cachePath),
  writeCache: (snapshot) => writeCachedSnapshot(config.cachePath, snapshot),
  collectSnapshot,
  now: () => new Date(),
});

controller.registerDeviceEvents();

const scheduler = createRefreshScheduler({
  refreshIntervalMs: config.refreshIntervalMs,
  refresh: controller.refresh,
  onError: (error) => console.error(error),
});

scheduler.start();

async function collectSnapshot() {
  const generatedAtDate = new Date();
  const until = formatDateYmd(generatedAtDate, config.timezone);
  const since = formatDateYmd(addDays(generatedAtDate, -6), config.timezone);
  const today = formatYmdForDashboard(until);
  const [allUsage, claudeUsage, codexUsage, opencodeUsage, ccusageVersion] = await Promise.all([
    collectCcusageJson('all', { since, until, timezone: config.timezone }),
    collectCcusageJson('claude', { since, until, timezone: config.timezone }),
    collectCcusageJson('codex', { since, until, timezone: config.timezone }),
    collectCcusageJson('opencode', { since, until, timezone: config.timezone }),
    collectCcusageVersion(),
  ]);

  return buildDashboardSnapshot({
    allUsage,
    agentUsage: {
      claude: claudeUsage,
      codex: codexUsage,
      opencode: opencodeUsage,
    },
    generatedAt: generatedAtDate.toISOString(),
    timezone: config.timezone,
    ccusageVersion,
    today,
    nextRefreshAt: new Date(generatedAtDate.getTime() + config.refreshIntervalMs).toISOString(),
    stale: false,
    refreshInProgress: false,
    error: null,
  });
}

function formatYmdForDashboard(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}
