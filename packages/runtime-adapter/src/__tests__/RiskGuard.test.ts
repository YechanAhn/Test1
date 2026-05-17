import { describe, it, expect } from "vitest";
import { RiskGuard } from "../RiskGuard.js";
import { StateManager } from "../StateManager.js";

const limits = {
  maxNotionalUsd: 100,
  maxLeverage: 3,
  maxDrawdownPct: 5,
  killDrawdownPct: 10,
  maxLossesPerDay: 5,
  maxLatencyMsP95: 500,
  minAccountBalance: 50,
};

function freshSM() {
  return new StateManager(
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
}

const sampleIntent = {
  clientOrderId: "c1",
  exchange: "binance-futures" as const,
  symbol: "BTC/USDT:USDT",
  side: "buy" as const,
  type: "market" as const,
  quantity: 1,
};

describe("RiskGuard", () => {
  it("정상 상태에서 통과", () => {
    const sm = freshSM();
    const g = new RiskGuard(limits, sm);
    expect(g.evaluate(sampleIntent, 50, 1)).toEqual([]);
  });

  it("kill switch 활성화 후 무조건 차단", () => {
    const sm = freshSM();
    const g = new RiskGuard(limits, sm);
    g.activateKillSwitch();
    const breaches = g.evaluate(sampleIntent, 50, 1);
    expect(breaches.map((b) => b.code)).toContain("KILL_SWITCH_DRAWDOWN");
  });

  it("latency 보고 후 임계 초과 → LATENCY_BUDGET 차단", () => {
    const sm = freshSM();
    const g = new RiskGuard(limits, sm);
    g.reportLatency(1000);
    expect(g.evaluate(sampleIntent, 50, 1).map((b) => b.code)).toContain("LATENCY_BUDGET");
  });

  it("drawdown 임계 도달 후 신규 진입 차단", () => {
    const sm = freshSM();
    sm.onBalanceUpdate(1200);
    sm.onBalanceUpdate(1000); // 17% DD
    const g = new RiskGuard(limits, sm);
    expect(g.evaluate(sampleIntent, 50, 1).map((b) => b.code)).toContain("KILL_SWITCH_DRAWDOWN");
  });

  it("kill switch 는 외부 호출자가 끄지 않으면 절대 자동 해제되지 않는다", () => {
    const sm = freshSM();
    const g = new RiskGuard(limits, sm);
    g.activateKillSwitch();
    // 여러 번 평가해도 풀리지 않음
    for (let i = 0; i < 5; i++) {
      expect(g.evaluate(sampleIntent, 1, 1).map((b) => b.code)).toContain("KILL_SWITCH_DRAWDOWN");
    }
    g.deactivateKillSwitch();
    expect(g.evaluate(sampleIntent, 1, 1)).toEqual([]);
  });
});
