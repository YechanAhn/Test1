import { describe, it, expect } from "vitest";
import { approves, evaluateRisk, type IntentEvaluation, type RiskContext } from "../risk.js";

const limits = {
  maxNotionalUsd: 100,
  maxLeverage: 3,
  maxDrawdownPct: 5,
  killDrawdownPct: 10,
  maxLossesPerDay: 5,
  maxLatencyMsP95: 500,
  minAccountBalance: 50,
};

function baseCtx(): RiskContext {
  return {
    limits,
    positions: [],
    accountBalanceUsd: 1000,
    peakBalanceUsd: 1000,
    lossesLast24h: 0,
    exchangeLatencyP95Ms: 100,
    killSwitchActive: false,
  };
}

function entryEval(notional: number, lev = 1): IntentEvaluation {
  return {
    intent: {
      clientOrderId: "c",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 1,
    },
    estimatedNotionalUsd: notional,
    estimatedLeverage: lev,
  };
}

describe("evaluateRisk", () => {
  it("정상 ctx + 명목가 한도 내 → 승인", () => {
    expect(approves(entryEval(50), baseCtx())).toBe(true);
  });

  it("kill switch 가 켜지면 모든 신규 진입 거부", () => {
    const ctx = baseCtx();
    ctx.killSwitchActive = true;
    const breaches = evaluateRisk(entryEval(10), ctx);
    expect(breaches.map((b) => b.code)).toContain("KILL_SWITCH_DRAWDOWN");
  });

  it("드로다운이 kill 임계 도달 → KILL_SWITCH_DRAWDOWN", () => {
    const ctx = baseCtx();
    ctx.accountBalanceUsd = 890; // 11% DD
    const breaches = evaluateRisk(entryEval(10), ctx);
    expect(breaches.map((b) => b.code)).toContain("KILL_SWITCH_DRAWDOWN");
  });

  it("드로다운이 max 만 넘으면 MAX_DRAWDOWN", () => {
    const ctx = baseCtx();
    ctx.accountBalanceUsd = 940; // 6% DD
    const breaches = evaluateRisk(entryEval(10), ctx);
    expect(breaches.map((b) => b.code)).toContain("MAX_DRAWDOWN");
  });

  it("명목가 초과 → MAX_NOTIONAL", () => {
    const ctx = baseCtx();
    expect(evaluateRisk(entryEval(150), ctx).map((b) => b.code)).toContain("MAX_NOTIONAL");
  });

  it("기존 포지션 + 추가 명목 합산", () => {
    const ctx = baseCtx();
    ctx.positions = [
      {
        exchange: "binance-futures",
        symbol: "BTC/USDT:USDT",
        side: "long",
        quantity: 1,
        entryPrice: 80,
        leverage: 1,
        unrealizedPnl: 0,
      },
    ];
    expect(evaluateRisk(entryEval(30), ctx).map((b) => b.code)).toContain("MAX_NOTIONAL"); // 80+30=110>100
  });

  it("reduceOnly 는 명목가 합산에서 제외 → 한도 초과해도 통과", () => {
    const ctx = baseCtx();
    const ev: IntentEvaluation = {
      ...entryEval(999),
      intent: { ...entryEval(0).intent, reduceOnly: true },
    };
    expect(approves(ev, ctx)).toBe(true);
  });

  it("레버리지 초과 → MAX_LEVERAGE", () => {
    expect(evaluateRisk(entryEval(10, 5), baseCtx()).map((b) => b.code)).toContain("MAX_LEVERAGE");
  });

  it("지연 초과 → LATENCY_BUDGET", () => {
    const ctx = baseCtx();
    ctx.exchangeLatencyP95Ms = 1000;
    expect(evaluateRisk(entryEval(10), ctx).map((b) => b.code)).toContain("LATENCY_BUDGET");
  });

  it("24h 손절 한도 초과 → STRATEGY_REJECT", () => {
    const ctx = baseCtx();
    ctx.lossesLast24h = 6;
    expect(evaluateRisk(entryEval(10), ctx).map((b) => b.code)).toContain("STRATEGY_REJECT");
  });

  it("최소 잔고 미만 신규 진입 → STRATEGY_REJECT", () => {
    const ctx = baseCtx();
    ctx.accountBalanceUsd = 10;
    ctx.peakBalanceUsd = 10; // DD 제외
    expect(evaluateRisk(entryEval(5), ctx).map((b) => b.code)).toContain("STRATEGY_REJECT");
  });

  it("위반 없음 → 빈 배열", () => {
    expect(evaluateRisk(entryEval(10), baseCtx())).toEqual([]);
  });
});
