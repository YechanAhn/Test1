import { Heartbeat, type HeartbeatPublisher, type HeartbeatMonitor } from "@alrgo/safety";
import type { IEventBus, Unsubscribe } from "./IEventBus.js";

/**
 * Safety 의 Heartbeat 를 EventBus 위에 wiring 한다.
 * 송신: 인터벌마다 `health.heartbeat` publish.
 * 수신: 다른 샤드/오케스트레이터가 구독해 monitor 에 feed.
 */
export function startHeartbeatPublisher(
  bus: IEventBus,
  shardId: string,
  intervalMs: number,
  clock: () => number = Date.now,
): HeartbeatPublisher {
  const pub = Heartbeat.publisher(
    intervalMs,
    (id, ts) => {
      void bus.publish("health.heartbeat", { shardId: id, ts });
    },
    clock,
  );
  pub.start(shardId);
  return pub;
}

export function startHeartbeatMonitor(
  bus: IEventBus,
  deadlineMs: number,
): { monitor: HeartbeatMonitor; stop: Unsubscribe } {
  const monitor = Heartbeat.monitor(deadlineMs);
  const unsub = bus.subscribe("health.heartbeat", ({ shardId, ts }) => {
    monitor.observe(shardId, ts);
  });
  return { monitor, stop: unsub };
}
