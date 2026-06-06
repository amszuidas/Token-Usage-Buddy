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
    let refreshHandler: (() => Promise<void>) | null = null;

    const controller = createBridgeController({
      config,
      ble: {
        sendJson: async (json) => { sent.push(json); },
        onRefreshRequest: (handler) => { refreshHandler = handler as () => Promise<void>; },
      },
      readCache: vi.fn().mockResolvedValue(null),
      writeCache: vi.fn(),
      collectSnapshot: vi.fn().mockRejectedValue(new Error('ccusage failed')),
      now,
    });

    controller.registerDeviceEvents();
    await refreshHandler?.();

    expect(JSON.parse(sent.at(-1) ?? '{}')).toMatchObject({
      schemaVersion: 1,
      stale: true,
      refreshInProgress: false,
      generatedAt: '2026-06-06T14:20:00.000Z',
      error: 'ccusage failed',
    });
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
