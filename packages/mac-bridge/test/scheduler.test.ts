import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRefreshScheduler } from '../src/scheduler.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createRefreshScheduler', () => {
  it('runs immediately and then on interval', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler({ refreshIntervalMs: 600_000, refresh });
    scheduler.start();
    await vi.runOnlyPendingTimersAsync();
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('calls onError for rejected refreshes and continues on the next interval', async () => {
    vi.useFakeTimers();
    const error = new Error('temporary ccusage failure');
    const refresh = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
    const onError = vi.fn();
    const scheduler = createRefreshScheduler({ refreshIntervalMs: 600_000, refresh, onError });

    scheduler.start();
    await vi.runOnlyPendingTimersAsync();
    expect(onError).toHaveBeenCalledWith(error);
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(600_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('keeps start idempotent while running', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler({ refreshIntervalMs: 600_000, refresh });

    scheduler.start();
    scheduler.start();
    await vi.runOnlyPendingTimersAsync();

    expect(refresh).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('stops future ticks', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler({ refreshIntervalMs: 600_000, refresh });

    scheduler.start();
    await vi.runOnlyPendingTimersAsync();
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(600_000);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('schedules the next interval only after refresh settles', async () => {
    vi.useFakeTimers();
    const firstRefresh = createDeferred<void>();
    const refresh = vi.fn().mockReturnValueOnce(firstRefresh.promise).mockResolvedValue(undefined);
    const scheduler = createRefreshScheduler({ refreshIntervalMs: 600_000, refresh });

    scheduler.start();
    vi.advanceTimersByTime(0);
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(600_000);
    expect(refresh).toHaveBeenCalledTimes(1);

    firstRefresh.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(600_000);

    expect(refresh).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
