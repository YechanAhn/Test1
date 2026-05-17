import { describe, it, expect } from "vitest";
import { evaluateWatcher, toRiskBreach } from "../Watcher.js";

const thresholds = {
  latencyP95Ms: 500,
  slippageBps: 30,
  oldestUnfilledMs: 30_000,
  notionalUsd: 50,
};

function input(over: Partial<Parameters<typeof evaluateWatcher>[0]> = {}) {
  return {
    latencyP95Ms: 100,
    slippageBps: 5,
    oldestUnfilledMs: 100,
    notionalUsd: 10,
    positions: [],
    ...over,
  };
}

describe("evaluateWatcher", () => {
  it("정상 입력 → 빈 배열", () => {
    expect(evaluateWatcher(input(), thresholds)).toEqual([]);
  });
  it("레이턴시 초과 → LATENCY", () => {
    const r = evaluateWatcher(input({ latencyP95Ms: 1000 }), thresholds);
    expect(r.map((a) => a.code)).toEqual(["LATENCY"]);
  });
  it("슬리피지 초과 → SLIPPAGE", () => {
    const r = evaluateWatcher(input({ slippageBps: 60 }), thresholds);
    expect(r.map((a) => a.code)).toEqual(["SLIPPAGE"]);
  });
  it("미체결 누적 → UNFILLED (error)", () => {
    const r = evaluateWatcher(input({ oldestUnfilledMs: 60_000 }), thresholds);
    expect(r[0]?.code).toBe("UNFILLED");
    expect(r[0]?.severity).toBe("error");
  });
  it("명목가 초과 → NOTIONAL (error)", () => {
    const r = evaluateWatcher(input({ notionalUsd: 100 }), thresholds);
    expect(r[0]?.code).toBe("NOTIONAL");
  });
  it("여러 위반 동시 감지", () => {
    const r = evaluateWatcher(
      input({ latencyP95Ms: 1000, notionalUsd: 100 }),
      thresholds,
    );
    expect(r.map((a) => a.code).sort()).toEqual(["LATENCY", "NOTIONAL"]);
  });

  it("toRiskBreach 매핑", () => {
    expect(
      toRiskBreach({ severity: "warn", code: "LATENCY", message: "m", ctx: { p95: 1 } }).code,
    ).toBe("LATENCY_BUDGET");
    expect(
      toRiskBreach({ severity: "error", code: "NOTIONAL", message: "m", ctx: { notional: 1 } })
        .code,
    ).toBe("MAX_NOTIONAL");
    expect(
      toRiskBreach({ severity: "warn", code: "SLIPPAGE", message: "m", ctx: { bps: 1 } }).code,
    ).toBe("STRATEGY_REJECT");
  });
});
