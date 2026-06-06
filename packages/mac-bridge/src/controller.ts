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
  let inFlightRefresh: Promise<void> | null = null;

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

  function refresh(): Promise<void> {
    if (inFlightRefresh != null) {
      return inFlightRefresh;
    }

    inFlightRefresh = runRefresh().finally(() => {
      inFlightRefresh = null;
    });
    return inFlightRefresh;
  }

  async function runRefresh(): Promise<void> {
    let cachedSnapshot: unknown | null = null;
    try {
      cachedSnapshot = await options.readCache();
    } catch (error) {
      await trySendRefreshError(error, null);
      throw error;
    }
    await refreshFromCachedSnapshot(cachedSnapshot);
  }

  async function refreshFromCachedSnapshot(cachedSnapshot: unknown | null): Promise<void> {
    await sendRefreshInProgress(cachedSnapshot);
    try {
      await collectCacheAndSendFresh();
    } catch (error) {
      await trySendRefreshError(error, cachedSnapshot);
      throw error;
    }
  }

  async function startOnce(): Promise<void> {
    const cachedSnapshot = await options.readCache();
    if (cachedSnapshot == null) {
      await refresh();
      return;
    }

    await refreshFromCachedSnapshot(cachedSnapshot);
  }

  async function trySendRefreshError(error: unknown, cachedSnapshot: unknown | null | undefined = undefined): Promise<void> {
    const message = errorMessage(error);
    try {
      let snapshot = cachedSnapshot;
      if (snapshot === undefined) {
        try {
          snapshot = await options.readCache();
        } catch {
          snapshot = null;
        }
      }
      await sendSnapshot(snapshot, {
        stale: true,
        refreshInProgress: false,
        error: message,
      });
    } catch {
      // The manual BLE event path must never surface an unhandled rejection.
    }
  }

  function registerDeviceEvents(): void {
    options.ble.onRefreshRequest(() => {
      void refresh().catch(() => undefined);
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
