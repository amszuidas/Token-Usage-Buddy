import { describe, expect, it, vi } from 'vitest';
import { createRefreshScheduler } from '../src/scheduler.js';

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
    vi.useRealTimers();
  });
});
