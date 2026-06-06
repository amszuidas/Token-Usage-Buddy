#!/usr/bin/env node

import { readCachedSnapshot, writeCachedSnapshot } from '../cache.js';
import { loadConfigFromEnv } from '../config.js';
import { createBleClient } from '../ble-client.js';
import { createBridgeRuntime } from '../bridge-runtime.js';
import { createBridgeController } from '../controller.js';
import { createRefreshScheduler } from '../scheduler.js';
import { collectDashboardSnapshot } from '../snapshot.js';

const RECONNECT_DELAY_MS = 5_000;
const config = loadConfigFromEnv(process.env);
const ble = createBleClient();

const controller = createBridgeController({
  config,
  ble,
  readCache: () => readCachedSnapshot(config.cachePath),
  writeCache: (snapshot) => writeCachedSnapshot(config.cachePath, snapshot),
  collectSnapshot: () => collectDashboardSnapshot({ config, now: () => new Date() }),
  now: () => new Date(),
});

controller.registerDeviceEvents();

const scheduler = createRefreshScheduler({
  refreshIntervalMs: config.refreshIntervalMs,
  refresh: controller.refresh,
  onError: (error) => console.error(error),
});

const runtime = createBridgeRuntime({
  ble,
  scheduler,
  reconnectDelayMs: RECONNECT_DELAY_MS,
  onError: (error) => console.error(error),
});

runtime.start();

async function shutdown(): Promise<void> {
  await runtime.stop();
}

process.once('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
