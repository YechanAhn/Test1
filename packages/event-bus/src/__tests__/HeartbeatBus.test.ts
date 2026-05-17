import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InMemoryEventBus } from "../InMemoryEventBus.js";
import { startHeartbeatMonitor, startHeartbeatPublisher } from "../HeartbeatBus.js";

describe("HeartbeatBus end-to-end", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("publisher 가 인터벌마다 heartbeat 를 보내고 monitor 가 관측한다", async () => {
    const bus = new InMemoryEventBus();
    const { monitor, stop } = startHeartbeatMonitor(bus, 2000);
    const clock = vi.fn(() => Date.now());
    const pub = startHeartbeatPublisher(bus, "shard-1", 500, clock);

    await vi.advanceTimersByTimeAsync(1500); // 3 ticks
    const stale = monitor.evaluate(Date.now());
    expect(stale).toEqual([]);

    pub.stop();
    stop();
  });

  it("publisher 정지 후 deadline 초과 시 stale 로 감지", async () => {
    const bus = new InMemoryEventBus();
    const { monitor, stop } = startHeartbeatMonitor(bus, 1000);
    const pub = startHeartbeatPublisher(bus, "shard-1", 200, () => Date.now());

    await vi.advanceTimersByTimeAsync(500);
    pub.stop();
    await vi.advanceTimersByTimeAsync(2000); // 정지 후 2s 흘려보내기

    const stale = monitor.evaluate(Date.now());
    expect(stale.map((s) => s.shardId)).toEqual(["shard-1"]);
    stop();
  });
});
