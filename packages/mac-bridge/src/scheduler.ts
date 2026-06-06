export interface RefreshSchedulerOptions {
  refreshIntervalMs: number;
  refresh: () => Promise<void>;
  onError?: (error: unknown) => void;
}

export function createRefreshScheduler(options: RefreshSchedulerOptions) {
  let timer: NodeJS.Timeout | null = null;
  let stopped = true;
  let generation = 0;

  async function tick(tickGeneration: number) {
    if (stopped || tickGeneration !== generation) return;
    try {
      await options.refresh();
    } catch (error) {
      try {
        options.onError?.(error);
      } catch {
        // Keep scheduler ticks from surfacing unhandled rejections.
      }
    } finally {
      if (!stopped && tickGeneration === generation) {
        timer = setTimeout(() => tick(tickGeneration), options.refreshIntervalMs);
      }
    }
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      generation += 1;
      const tickGeneration = generation;
      timer = setTimeout(() => tick(tickGeneration), 0);
    },
    stop() {
      stopped = true;
      generation += 1;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
