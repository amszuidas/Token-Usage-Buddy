export interface RefreshSchedulerOptions {
  refreshIntervalMs: number;
  refresh: () => Promise<void>;
}

export function createRefreshScheduler(options: RefreshSchedulerOptions) {
  let timer: NodeJS.Timeout | null = null;
  let stopped = true;

  async function tick() {
    if (stopped) return;
    await options.refresh();
    if (!stopped) timer = setTimeout(tick, options.refreshIntervalMs);
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
