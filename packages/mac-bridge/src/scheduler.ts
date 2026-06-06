export interface RefreshSchedulerOptions {
  refreshIntervalMs: number;
  refresh: () => Promise<void>;
  onError?: (error: unknown) => void;
}

export function createRefreshScheduler(options: RefreshSchedulerOptions) {
  let timer: NodeJS.Timeout | null = null;
  let stopped = true;

  async function tick() {
    if (stopped) return;
    try {
      await options.refresh();
    } catch (error) {
      try {
        options.onError?.(error);
      } catch {
        // Keep scheduler ticks from surfacing unhandled rejections.
      }
    } finally {
      if (!stopped) timer = setTimeout(tick, options.refreshIntervalMs);
    }
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      timer = setTimeout(tick, 0);
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
