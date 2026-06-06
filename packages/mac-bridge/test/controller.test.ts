import { describe, expect, it, vi } from 'vitest';
import { createBridgeController } from '../src/controller.js';

const config = {
  refreshIntervalMs: 600_000,
  timezone: 'Asia/Shanghai',
  cachePath: '/tmp/cache.json',
};

const now = () => new Date('2026-06-06T14:20:00.000Z');

describe('createBridgeController', () => {
  it('sends cached stale data before a fresh refresh', async () => {
    const sent: string[] = [];
    const cached = { schemaVersion: 1, stale: false, refreshInProgress: false, today: { totalTokens: 1 } };
    const fresh = { schemaVersion: 1, stale: false, refreshInProgress: false, today: { totalTokens: 2 } };

    const controller = createBridgeController({
      config,
      ble: { sendJson: async (json) => { sent.push(json); }, onRefreshRequest: vi.fn() },
      readCache: vi.fn().mockResolvedValue(cached),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockResolvedValue(fresh),
      now,
    });

    await controller.startOnce();

    expect(JSON.parse(sent[0])).toMatchObject({
      stale: true,
      refreshInProgress: true,
      today: { totalTokens: 1 },
    });
    expect(JSON.parse(sent.at(-1) ?? '{}')).toMatchObject({
      stale: false,
      refreshInProgress: false,
      today: { totalTokens: 2 },
    });
  });

  it('shows refreshInProgress while manual refresh is running without cache', async () => {
    const sent: string[] = [];
    let refreshHandler: (() => Promise<void>) | null = null;
    const fresh = {
      schemaVersion: 1,
      stale: false,
      refreshInProgress: false,
      today: { totalTokens: 493_800_000 },
    };
    const freshSnapshot = createDeferred<typeof fresh>();

    const controller = createBridgeController({
      config,
      ble: {
        sendJson: async (json) => { sent.push(json); },
        onRefreshRequest: (handler) => { refreshHandler = handler as () => Promise<void>; },
      },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockReturnValue(freshSnapshot.promise),
      now,
    });

    controller.registerDeviceEvents();
    const refreshPromise = refreshHandler?.();
    await flushAsyncWork();

    expect(sent.some((json) => JSON.parse(json).refreshInProgress === true)).toBe(true);

    freshSnapshot.resolve(fresh);
    await refreshPromise;
  });

  it('turns off refreshInProgress and sends an error when manual refresh fails without cache', async () => {
    const sent: string[] = [];
    let refreshHandler: (() => void) | null = null;

    const controller = createBridgeController({
      config,
      ble: {
        sendJson: async (json) => { sent.push(json); },
        onRefreshRequest: (handler) => { refreshHandler = handler; },
      },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockRejectedValue(new Error('ccusage failed')),
      now,
    });

    controller.registerDeviceEvents();
    refreshHandler?.();
    await flushAsyncWork();

    expect(JSON.parse(sent.at(-1) ?? '{}')).toMatchObject({
      schemaVersion: 1,
      stale: true,
      refreshInProgress: false,
      generatedAt: '2026-06-06T14:20:00.000Z',
      error: 'ccusage failed',
    });
  });

  it('turns off refreshInProgress when scheduled refresh fails without cache', async () => {
    const sent: string[] = [];

    const controller = createBridgeController({
      config,
      ble: { sendJson: async (json) => { sent.push(json); }, onRefreshRequest: vi.fn() },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockRejectedValue(new Error('ccusage failed')),
      now,
    });

    await expect(controller.refresh()).rejects.toThrow('ccusage failed');

    expect(JSON.parse(sent.at(-1) ?? '{}')).toMatchObject({
      schemaVersion: 1,
      stale: true,
      refreshInProgress: false,
      generatedAt: '2026-06-06T14:20:00.000Z',
      error: 'ccusage failed',
    });
  });

  it('coalesces concurrent refresh calls into one collection and one result send', async () => {
    const sent: string[] = [];
    const fresh = { schemaVersion: 1, stale: false, refreshInProgress: false, today: { totalTokens: 2 } };
    const freshSnapshot = createDeferred<typeof fresh>();
    const readCache = vi.fn().mockResolvedValue(null);
    const writeCache = vi.fn();
    const collectSnapshot = vi.fn().mockReturnValue(freshSnapshot.promise);

    const controller = createBridgeController({
      config,
      ble: { sendJson: async (json) => { sent.push(json); }, onRefreshRequest: vi.fn() },
      readCache,
      writeCache,
      collectSnapshot,
      now,
    });

    const firstRefresh = controller.refresh();
    const secondRefresh = controller.refresh();
    await flushAsyncWork();

    expect(firstRefresh).toBe(secondRefresh);
    expect(readCache).toHaveBeenCalledTimes(1);
    expect(collectSnapshot).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toMatchObject({
      stale: true,
      refreshInProgress: true,
    });

    freshSnapshot.resolve(fresh);
    await Promise.all([firstRefresh, secondRefresh]);

    expect(writeCache).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[1])).toMatchObject({
      stale: false,
      refreshInProgress: false,
      today: { totalTokens: 2 },
    });
  });

  it('coalesces a manual refresh request while a refresh is already running', async () => {
    const sent: string[] = [];
    let refreshHandler: (() => void) | null = null;
    const fresh = { schemaVersion: 1, stale: false, refreshInProgress: false, today: { totalTokens: 3 } };
    const freshSnapshot = createDeferred<typeof fresh>();
    const collectSnapshot = vi.fn().mockReturnValue(freshSnapshot.promise);

    const controller = createBridgeController({
      config,
      ble: {
        sendJson: async (json) => { sent.push(json); },
        onRefreshRequest: (handler) => { refreshHandler = handler; },
      },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot,
      now,
    });

    controller.registerDeviceEvents();
    const scheduledRefresh = controller.refresh();
    await flushAsyncWork();

    refreshHandler?.();
    await flushAsyncWork();

    expect(collectSnapshot).toHaveBeenCalledTimes(1);
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0])).toMatchObject({
      stale: true,
      refreshInProgress: true,
    });

    freshSnapshot.resolve(fresh);
    await scheduledRefresh;
    await flushAsyncWork();

    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[1])).toMatchObject({
      stale: false,
      refreshInProgress: false,
      today: { totalTokens: 3 },
    });
  });

  it('turns off refreshInProgress with cached stale data when scheduled refresh fails with cache', async () => {
    const sent: string[] = [];
    const cached = {
      schemaVersion: 1,
      stale: false,
      refreshInProgress: false,
      today: { totalTokens: 1 },
    };

    const controller = createBridgeController({
      config,
      ble: { sendJson: async (json) => { sent.push(json); }, onRefreshRequest: vi.fn() },
      readCache: vi.fn().mockResolvedValue(cached),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockRejectedValue(new Error('ccusage failed')),
      now,
    });

    await expect(controller.refresh()).rejects.toThrow('ccusage failed');

    expect(JSON.parse(sent.at(-1) ?? '{}')).toMatchObject({
      schemaVersion: 1,
      stale: true,
      refreshInProgress: false,
      error: 'ccusage failed',
      today: { totalTokens: 1 },
    });
  });

  it('does not expose an async promise from the manual refresh handler', () => {
    let refreshHandler: (() => void) | null = null;

    const controller = createBridgeController({
      config,
      ble: {
        sendJson: vi.fn().mockResolvedValue(undefined),
        onRefreshRequest: (handler) => { refreshHandler = handler; },
      },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockRejectedValue(new Error('ccusage failed')),
      now,
    });

    controller.registerDeviceEvents();

    expect(refreshHandler?.()).toBeUndefined();
  });

  it('swallows failed manual refresh error payload sends', async () => {
    let refreshHandler: (() => void) | null = null;
    const sendJson = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ble write failed'));

    const controller = createBridgeController({
      config,
      ble: {
        sendJson,
        onRefreshRequest: (handler) => { refreshHandler = handler; },
      },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockRejectedValue(new Error('ccusage failed')),
      now,
    });

    controller.registerDeviceEvents();
    refreshHandler?.();
    await flushAsyncWork();

    expect(sendJson).toHaveBeenCalledTimes(2);
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}
