import { describe, it, expect, vi } from "vitest";
import { Executor } from "../Executor.js";
import { RiskGuard } from "../RiskGuard.js";
import { StateManager } from "../StateManager.js";
import { MockExchange } from "@alrgo/exchange";
import { InMemoryEventBus } from "@alrgo/event-bus";

const limits = {
  maxNotionalUsd: 100,
  maxLeverage: 3,
  maxDrawdownPct: 5,
  killDrawdownPct: 10,
  maxLossesPerDay: 5,
  maxLatencyMsP95: 500,
  minAccountBalance: 50,
};

function build() {
  const ex = new MockExchange();
  ex.setPrice("BTC/USDT:USDT", 100);
  const sm = new StateManager(
    {
      shardId: "s1",
      ownerUid: "u1",
      status: "RUNNING",
      heartbeatAt: 0,
      positions: [],
      openOrders: [],
      pnlSession: 0,
      drawdownPct: 0,
    },
    1000,
  );
  const guard = new RiskGuard(limits, sm);
  const bus = new InMemoryEventBus();
  const estimate = (i: { quantity: number }) => ({ notionalUsd: i.quantity * 100, leverage: 1 });
  const executor = new Executor("s1", ex, guard, bus, estimate);
  return { ex, sm, guard, bus, executor };
}

describe("Executor", () => {
  it("정상 의도는 거래소로 전달되고 ack 반환", async () => {
    const { ex, executor, bus } = build();
    const traderOrder = vi.fn();
    bus.subscribe("trader.order", traderOrder);
    const intent = {
      clientOrderId: "c1",
      exchange: "binance-futures" as const,
      symbol: "BTC/USDT:USDT",
      side: "buy" as const,
      type: "market" as const,
      quantity: 0.5,
    };
    const r = await executor.execute(intent);
    expect(r.ack).toBeDefined();
    expect(r.breaches).toEqual([]);
    expect(traderOrder).toHaveBeenCalledOnce();
    expect((await ex.getPositions())).toHaveLength(1);
  });

  it("리스크 거부 시 거래소 호출 X + watcher.risk publish", async () => {
    const { ex, executor, bus } = build();
    const risk = vi.fn();
    bus.subscribe("watcher.risk", risk);
    // 명목가 한도 초과 (100 quantity * 100 price = 10000)
    const r = await executor.execute({
      clientOrderId: "c1",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 100,
    });
    expect(r.ack).toBeUndefined();
    expect(r.breaches.map((b) => b.code)).toContain("MAX_NOTIONAL");
    expect(risk).toHaveBeenCalled();
    expect(await ex.getPositions()).toHaveLength(0);
  });

  it("Kill Switch 활성 후 reduceOnly 도 차단된다(전 활동 정지)", async () => {
    const { executor, guard } = build();
    guard.activateKillSwitch();
    const r = await executor.execute({
      clientOrderId: "c1",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "sell",
      type: "market",
      quantity: 0.5,
      reduceOnly: true,
    });
    expect(r.breaches.map((b) => b.code)).toContain("KILL_SWITCH_DRAWDOWN");
  });
});
