import { describe, it, expect } from "vitest";
import { Heartbeat } from "../heartbeat.js";

describe("Heartbeat.monitor", () => {
  it("flags shards past the deadline", () => {
    const mon = Heartbeat.monitor(2000);
    mon.observe("shard-1", 1000);
    mon.observe("shard-2", 5000);
    const stale = mon.evaluate(6000);
    expect(stale.map((s) => s.shardId)).toEqual(["shard-1"]);
    expect(stale[0]?.missedMs).toBe(5000);
  });

  it("returns empty when all shards are fresh", () => {
    const mon = Heartbeat.monitor(2000);
    mon.observe("shard-1", 5000);
    expect(mon.evaluate(5500)).toEqual([]);
  });
});
