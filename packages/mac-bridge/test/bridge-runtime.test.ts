import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBridgeRuntime } from '../src/bridge-runtime.js';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('createBridgeRuntime', () => {
  it('retries BLE connection after startup scan failures', async () => {
    vi.useFakeTimers();
    const scanTimeout = new Error('Timed out scanning for TokenUsageBuddy');
    const ble = createFakeBle();
    const scheduler = createFakeScheduler();
    const onError = vi.fn();
    ble.connect.mockRejectedValueOnce(scanTimeout).mockResolvedValue(undefined);

    const runtime = createBridgeRuntime({
      ble,
      scheduler,
      reconnectDelayMs: 1_000,
      onError,
    });
    runtime.start();

    await flushAsyncWork();
    expect(ble.connect).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(scanTimeout);
    expect(scheduler.start).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(999);
    expect(ble.connect).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(ble.connect).toHaveBeenCalledTimes(2);
    expect(scheduler.start).toHaveBeenCalledTimes(1);

    await runtime.stop();
  });

  it('stops refreshes and reconnects when BLE disconnects', async () => {
    vi.useFakeTimers();
    const ble = createFakeBle();
    const scheduler = createFakeScheduler();
    const runtime = createBridgeRuntime({
      ble,
      scheduler,
      reconnectDelayMs: 1_000,
    });

    runtime.start();
    await flushAsyncWork();
    expect(ble.connect).toHaveBeenCalledTimes(1);
    expect(scheduler.start).toHaveBeenCalledTimes(1);

    ble.emitDisconnect();
    expect(scheduler.stop).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(ble.connect).toHaveBeenCalledTimes(2);
    expect(scheduler.start).toHaveBeenCalledTimes(2);

    await runtime.stop();
  });

  it('cancels a pending reconnect when stopped', async () => {
    vi.useFakeTimers();
    const ble = createFakeBle();
    const scheduler = createFakeScheduler();
    const runtime = createBridgeRuntime({
      ble,
      scheduler,
      reconnectDelayMs: 1_000,
    });

    runtime.start();
    await flushAsyncWork();
    ble.emitDisconnect();

    await runtime.stop();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(ble.connect).toHaveBeenCalledTimes(1);
    expect(ble.disconnect).toHaveBeenCalledTimes(1);
  });

  it('requests a fatal restart after too many consecutive BLE connection failures', async () => {
    vi.useFakeTimers();
    const firstError = new Error('first scan failure');
    const secondError = new Error('second scan failure');
    const ble = createFakeBle();
    const scheduler = createFakeScheduler();
    const onError = vi.fn();
    const onFatalError = vi.fn();
    ble.connect.mockRejectedValueOnce(firstError).mockRejectedValueOnce(secondError).mockResolvedValue(undefined);

    const runtime = createBridgeRuntime({
      ble,
      scheduler,
      reconnectDelayMs: 1_000,
      maxConsecutiveConnectFailures: 2,
      onError,
      onFatalError,
    });
    runtime.start();

    await flushAsyncWork();
    expect(onError).toHaveBeenCalledWith(firstError);
    expect(onFatalError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);

    expect(ble.connect).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(secondError);
    expect(onFatalError).toHaveBeenCalledWith(secondError);
    expect(scheduler.start).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(ble.connect).toHaveBeenCalledTimes(2);
  });
});

function createFakeBle() {
  let disconnectHandler: (() => void) | null = null;
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    onDisconnect: vi.fn((handler: () => void) => {
      disconnectHandler = handler;
    }),
    emitDisconnect() {
      disconnectHandler?.();
    },
  };
}

function createFakeScheduler() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
  };
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
