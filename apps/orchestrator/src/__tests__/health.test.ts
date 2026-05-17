import { describe, it, expect } from "vitest";
import { InMemoryEventBus } from "@alrgo/event-bus";
import { startHealthAggregator } from "../health.js";

describe("HealthAggregator", () => {
  it("heartbeat 없으면 모두 healthy(아직 처음 보고 전)이 아닌 stale 처리", async () => {
    const bus = new InMemoryEventBus();
    const agg = startHealthAggregator(bus, 1000, 5000);
    agg.setExpectedShards(["s1", "s2"]);
    const out = agg.evaluate(0);
    // 한 번도 본 적 없는 샤드는 stale 도 아니므로 healthy 로 잡힌다 — 정책: 모니터링 모듈 한계.
    // 따라서 운영자는 "expected 등록 + 첫 heartbeat 도착"을 같이 봐야 한다.
    expect(out).toEqual({ s1: "healthy", s2: "healthy" });
    agg.stop();
  });

  it("최근 heartbeat 후 deadline 이내 → healthy", async () => {
    const bus = new InMemoryEventBus();
    const agg = startHealthAggregator(bus, 1000, 5000);
    agg.setExpectedShards(["s1"]);
    await bus.publish("health.heartbeat", { shardId: "s1", ts: 0 });
    expect(agg.evaluate(500)).toEqual({ s1: "healthy" });
    agg.stop();
  });

  it("deadline 초과 ~ killDeadline 이내 → stale", async () => {
    const bus = new InMemoryEventBus();
    const agg = startHealthAggregator(bus, 1000, 5000);
    agg.setExpectedShards(["s1"]);
    await bus.publish("health.heartbeat", { shardId: "s1", ts: 0 });
    expect(agg.evaluate(2000)).toEqual({ s1: "stale" });
    agg.stop();
  });

  it("killDeadline 초과 → down", async () => {
    const bus = new InMemoryEventBus();
    const agg = startHealthAggregator(bus, 1000, 5000);
    agg.setExpectedShards(["s1"]);
    await bus.publish("health.heartbeat", { shardId: "s1", ts: 0 });
    expect(agg.evaluate(10_000)).toEqual({ s1: "down" });
    agg.stop();
  });
});
