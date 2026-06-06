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
    await adapter.startScanningAsync(options.serviceUuids, options.allowDuplicates);
    timeout = setTimeout(() => rejectScan(new Error(options.timeoutMessage)), options.timeoutMs);
    return await discovered;
  } finally {
    if (timeout) clearTimeout(timeout);
    adapter.removeListener('discover', onDiscover);
    await adapter.stopScanningAsync().catch(() => undefined);
  }
}
