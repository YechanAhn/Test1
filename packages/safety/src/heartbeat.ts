export interface HeartbeatPublisher {
  start(shardId: string): void;
  stop(): void;
}

export interface HeartbeatMonitor {
  observe(shardId: string, ts: number): void;
  evaluate(now: number): { shardId: string; missedMs: number }[];
}

export const Heartbeat = {
  publisher(
    intervalMs: number,
    publish: (shardId: string, ts: number) => void,
    clock: () => number = Date.now,
  ): HeartbeatPublisher {
    let timer: ReturnType<typeof setInterval> | null = null;
    return {
      start(shardId: string) {
        if (timer) return;
        timer = setInterval(() => publish(shardId, clock()), intervalMs);
      },
      stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      },
    };
  },

  monitor(deadlineMs: number): HeartbeatMonitor {
    const last = new Map<string, number>();
    return {
      observe(shardId, ts) {
        last.set(shardId, ts);
      },
      evaluate(now) {
        const out: { shardId: string; missedMs: number }[] = [];
        for (const [shardId, ts] of last) {
          const missed = now - ts;
          if (missed > deadlineMs) out.push({ shardId, missedMs: missed });
        }
        return out;
      },
    };
  },
};
