export type RefreshRequestHandler = () => void | Promise<void>;

export interface ScanAdapter<TPeripheral> {
  startScanningAsync(serviceUUIDs?: string[], allowDuplicates?: boolean): Promise<void>;
  stopScanningAsync(): Promise<void>;
  on(event: 'discover', listener: (peripheral: TPeripheral) => void): unknown;
  removeListener(event: 'discover', listener: (peripheral: TPeripheral) => void): unknown;
}

export interface ScanForPeripheralOptions<TPeripheral> {
  serviceUuids: string[];
  allowDuplicates: boolean;
  timeoutMs: number;
  timeoutMessage: string;
  isMatch: (peripheral: TPeripheral) => boolean;
}

const STOP_SCAN_TIMEOUT_MS = 1_000;

export function invokeRefreshHandler(handler: RefreshRequestHandler | null): void {
  if (!handler) return;

  try {
    void Promise.resolve(handler()).catch(() => undefined);
  } catch {
    // BLE notification callbacks should not surface handler failures.
  }
}

export async function scanForPeripheral<TPeripheral>(
  adapter: ScanAdapter<TPeripheral>,
  options: ScanForPeripheralOptions<TPeripheral>,
): Promise<TPeripheral> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let resolveScan!: (peripheral: TPeripheral) => void;
  let rejectScan!: (error: Error) => void;
  const onDiscover = (peripheral: TPeripheral) => {
    if (options.isMatch(peripheral)) resolveScan(peripheral);
  };
  const discovered = new Promise<TPeripheral>((resolve, reject) => {
    resolveScan = resolve;
    rejectScan = reject;
  });

  adapter.on('discover', onDiscover);
  try {
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(options.timeoutMessage)), options.timeoutMs);
    });
    const scanStarted = adapter.startScanningAsync(options.serviceUuids, options.allowDuplicates);
    scanStarted.catch(() => undefined);
    await Promise.race([scanStarted, timedOut]);
    return await Promise.race([discovered, timedOut]);
  } finally {
    if (timeout) clearTimeout(timeout);
    adapter.removeListener('discover', onDiscover);
    await stopScanning(adapter);
  }
}

async function stopScanning<TPeripheral>(adapter: ScanAdapter<TPeripheral>): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const stopped = adapter.stopScanningAsync().catch(() => undefined);
  try {
    await Promise.race([
      stopped,
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, STOP_SCAN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
