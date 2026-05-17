import { describe, it, expect } from "vitest";
import { buildDashboardModel } from "../dashboard-model.js";
import type { ShardState } from "@alrgo/core-types";

function mkShard(over: Partial<ShardState> = {}): ShardState {
  return {
    shardId: "s1",
    ownerUid: "u1",
    status: "RUNNING",
    heartbeatAt: 1000,
    positions: [],
    openOrders: [],
    pnlSession: 0,
    drawdownPct: 0,
    ...over,
  };
}

describe("buildDashboardModel", () => {
  it("샤드 0개 → 합계 모두 0", () => {
    const m = buildDashboardModel([], 1000);
    expect(m.totalPnlSession).toBe(0);
    expect(m.totalNotionalUsd).toBe(0);
    expect(m.worstDrawdownPct).toBe(0);
    expect(m.shards).toEqual([]);
  });

  it("명목가 합산 + worst DD 추적", () => {
    const m = buildDashboardModel(
      [
        mkShard({
          shardId: "s1",
          drawdownPct: 3,
          positions: [
            {
              exchange: "binance-futures",
              symbol: "BTC/USDT:USDT",
              side: "long",
              quantity: 0.5,
              entryPrice: 100,
              leverage: 1,
              unrealizedPnl: 0,
            },
          ],
          pnlSession: 10,
        }),
        mkShard({ shardId: "s2", drawdownPct: 7, pnlSession: -3 }),
      ],
      1000,
    );
    expect(m.totalNotionalUsd).toBe(50);
    expect(m.totalPnlSession).toBe(7);
    expect(m.worstDrawdownPct).toBe(7);
  });

  it("하트비트 나이로 healthy/stale/down 분류", () => {
    const m = buildDashboardModel(
      [
        mkShard({ shardId: "fresh", heartbeatAt: 9_500 }),
        mkShard({ shardId: "stale", heartbeatAt: 6_000 }),
        mkShard({ shardId: "dead", heartbeatAt: 0 }),
      ],
      10_000,
      2_000,
      8_000,
    );
    const byId = Object.fromEntries(m.shards.map((s) => [s.shardId, s.health]));
    expect(byId).toEqual({ fresh: "healthy", stale: "stale", dead: "down" });
  });
});
