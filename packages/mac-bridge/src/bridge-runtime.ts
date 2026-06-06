export interface BridgeRuntimeBle {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onDisconnect(handler: () => void): void;
}

export interface BridgeRuntimeScheduler {
  start(): void;
  stop(): void;
}

export interface BridgeRuntimeOptions {
  ble: BridgeRuntimeBle;
  scheduler: BridgeRuntimeScheduler;
  reconnectDelayMs: number;
  onError?: (error: unknown) => void;
}

export function createBridgeRuntime(options: BridgeRuntimeOptions) {
  let stopped = true;
  let connecting = false;
  let generation = 0;
  let reconnectTimer: NodeJS.Timeout | null = null;

  options.ble.onDisconnect(() => {
    if (stopped) return;

    options.scheduler.stop();
    scheduleReconnect(generation);
  });

  async function connect(runGeneration: number): Promise<void> {
    if (stopped || runGeneration !== generation || connecting) return;

    clearReconnectTimer();
    connecting = true;
    try {
      await options.ble.connect();
      if (stopped || runGeneration !== generation) {
        await options.ble.disconnect().catch(() => undefined);
        return;
      }

      options.scheduler.start();
    } catch (error) {
      if (!stopped && runGeneration === generation) {
        reportError(error);
        scheduleReconnect(runGeneration);
      }
    } finally {
      connecting = false;
    }
  }

  function scheduleReconnect(runGeneration: number): void {
    if (stopped || runGeneration !== generation || reconnectTimer !== null) return;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connect(runGeneration);
    }, options.reconnectDelayMs);
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer === null) return;

    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function reportError(error: unknown): void {
    try {
      options.onError?.(error);
    } catch {
      // Runtime error reporting should never stop reconnect attempts.
    }
  }

  return {
    start(): void {
      if (!stopped) return;

      stopped = false;
      generation += 1;
      void connect(generation);
    },

    async stop(): Promise<void> {
      if (stopped) return;

      stopped = true;
      generation += 1;
      clearReconnectTimer();
      options.scheduler.stop();
      await options.ble.disconnect();
    },
  };
}
