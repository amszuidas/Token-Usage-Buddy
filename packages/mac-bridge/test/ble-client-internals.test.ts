import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { invokeRefreshHandler, scanForPeripheral } from '../src/ble-client-internals.js';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('BLE client internals', () => {
  it('swallows rejected refresh handlers from BLE notifications', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('refresh failed'));

    invokeRefreshHandler(handler);
    await flushAsyncWork();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stops scanning and removes discover listener on timeout', async () => {
    vi.useFakeTimers();
    const adapter = new FakeScanAdapter();

    const scan = scanForPeripheral(adapter, {
      serviceUuids: ['service'],
      allowDuplicates: false,
      timeoutMs: 1_000,
      timeoutMessage: 'scan timed out',
      isMatch: () => false,
    });
    await Promise.resolve();

    expect(adapter.listenerCount('discover')).toBe(1);
    const timeoutExpectation = expect(scan).rejects.toThrow('scan timed out');
    await vi.advanceTimersByTimeAsync(1_000);
    await timeoutExpectation;
    expect(adapter.stopScanningAsync).toHaveBeenCalledTimes(1);
    expect(adapter.listenerCount('discover')).toBe(0);
  });

  it('stops scanning and removes discover listener on success', async () => {
    const adapter = new FakeScanAdapter();
    const peripheral = { id: 'token-usage-buddy' };

    const scan = scanForPeripheral(adapter, {
      serviceUuids: ['service'],
      allowDuplicates: false,
      timeoutMs: 1_000,
      timeoutMessage: 'scan timed out',
      isMatch: (candidate) => candidate === peripheral,
    });
    await Promise.resolve();

    adapter.emit('discover', peripheral);

    await expect(scan).resolves.toBe(peripheral);
    expect(adapter.stopScanningAsync).toHaveBeenCalledTimes(1);
    expect(adapter.listenerCount('discover')).toBe(0);
  });
});

class FakeScanAdapter extends EventEmitter {
  startScanningAsync = vi.fn().mockResolvedValue(undefined);
  stopScanningAsync = vi.fn().mockResolvedValue(undefined);
}

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}
