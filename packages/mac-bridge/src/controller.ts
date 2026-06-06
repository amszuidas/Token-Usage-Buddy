import type { BridgeConfig } from './config.js';

export interface BridgeBle {
  sendJson(json: string): Promise<void>;
  onRefreshRequest(handler: () => void): void;
}

export interface BridgeControllerOptions {
  config: BridgeConfig;
  ble: BridgeBle;
  readCache: () => Promise<unknown | null>;
  writeCache: (snapshot: unknown) => Promise<void>;
  collectSnapshot: () => Promise<unknown>;
  now: () => Date;
}

export function createBridgeController(options: BridgeControllerOptions) {
  async function sendSnapshot(snapshot: unknown | null, state: SnapshotState): Promise<void> {
    await options.ble.sendJson(JSON.stringify(applyState(snapshot, state, options)));
  }

  async function sendRefreshInProgress(cachedSnapshot: unknown | null): Promise<void> {
    await sendSnapshot(cachedSnapshot, {
      stale: true,
      refreshInProgress: true,
      error: null,
    });
  }

  async function collectCacheAndSendFresh(): Promise<void> {
    const fresh = applyState(
      await options.collectSnapshot(),
      {
        stale: false,
        refreshInProgress: false,
        error: null,
      },
      options,
    );
    await options.writeCache(fresh);
    await options.ble.sendJson(JSON.stringify(fresh));
  }

  async function refresh(): Promise<void> {
    const cachedSnapshot = await options.readCache();
    await sendRefreshInProgress(cachedSnapshot);
    await collectCacheAndSendFresh();
  }

  async function startOnce(): Promise<void> {
    const cachedSnapshot = await options.readCache();
    if (cachedSnapshot == null) {
      await refresh();
      return;
    }

    await sendRefreshInProgress(cachedSnapshot);
    await collectCacheAndSendFresh();
  }

  async function sendRefreshError(error: unknown): Promise<void> {
    const message = errorMessage(error);
    let cachedSnapshot: unknown | null = null;
    try {
      cachedSnapshot = await options.readCache();
    } catch {
      cachedSnapshot = null;
    }
    await sendSnapshot(cachedSnapshot, {
      stale: true,
      refreshInProgress: false,
      error: message,
    });
  }

  function registerDeviceEvents(): void {
    options.ble.onRefreshRequest(async () => {
      try {
        await refresh();
      } catch (error) {
        await sendRefreshError(error);
      }
    });
  }

  return { startOnce, refresh, registerDeviceEvents };
}

interface SnapshotState {
  stale: boolean;
  refreshInProgress: boolean;
  error: string | null;
}

function applyState(snapshot: unknown | null, state: SnapshotState, options: BridgeControllerOptions): Record<string, unknown> {
  if (isRecord(snapshot)) {
    return {
      ...snapshot,
      stale: state.stale,
      refreshInProgress: state.refreshInProgress,
      error: state.error,
    };
  }

  return {
    schemaVersion: 1,
    stale: state.stale,
    refreshInProgress: state.refreshInProgress,
    generatedAt: options.now().toISOString(),
    timezone: options.config.timezone,
    error: state.error,
    nextRefreshAt: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  if (typeof error === 'string' && error.length > 0) return error;
  return 'Unknown refresh error';
}
