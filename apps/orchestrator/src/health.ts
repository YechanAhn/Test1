import type { IEventBus } from "@alrgo/event-bus";
import { startHeartbeatMonitor } from "@alrgo/event-bus";

export type ShardHealth = "healthy" | "stale" | "down";

export interface HealthAggregator {
  evaluate(now: number): Record<string, ShardHealth>;
  setExpectedShards(shardIds: string[]): void;
  stop(): void;
}

/**
 * 헬스 집계: 예상 샤드 목록 vs heartbeat 도착.
 *  - healthy: heartbeat 가 deadline 이내
 *  - stale:   deadline 초과, killDeadline 이내 → 페일오버 후보
 *  - down:    killDeadline 초과 → 즉시 페일오버
 */
export function startHealthAggregator(
  bus: IEventBus,
  deadlineMs: number,
  killDeadlineMs: number,
): HealthAggregator {
  let expected: string[] = [];
  const { monitor, stop } = startHeartbeatMonitor(bus, deadlineMs);

  return {
    setExpectedShards(shardIds: string[]) {
      expected = shardIds;
    },
    evaluate(now: number) {
      const stale = new Map(monitor.evaluate(now).map((s) => [s.shardId, s.missedMs]));
      const out: Record<string, ShardHealth> = {};
      for (const id of expected) {
        const missed = stale.get(id);
        if (missed === undefined) out[id] = "healthy";
        else if (missed > killDeadlineMs) out[id] = "down";
        else out[id] = "stale";
      }
      return out;
    },
    stop,
  };
}
