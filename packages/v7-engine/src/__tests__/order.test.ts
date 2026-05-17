import { describe, it, expect } from "vitest";
import { buildIntentsForDecision } from "../order.js";
import type { Position } from "@alrgo/core-types";

const deps = {
  symbol: "BTC/USDT:USDT",
  exchange: "binance-futures" as const,
  lastPrice: 100,
  sizing: { accountBalance: 10_000, riskPct: 0.005 },
  idPrefix: "s1",
  idSeq: 1700000000000,
};

describe("buildIntentsForDecision", () => {
  it("hold → 빈 배열", () => {
    expect(buildIntentsForDecision({ action: "hold", reason: "x" }, undefined, deps)).toHaveLength(0);
  });

  it("enter long → entry market + stop_market reduceOnly", () => {
    const out = buildIntentsForDecision(
      { action: "enter", side: "long", stopPrice: 98, reason: "x" },
      undefined,
      deps,
    );
    expect(out).toHaveLength(2);
    const entry = out[0]!;
    const stop = out[1]!;
    expect(entry.side).toBe("buy");
    expect(entry.type).toBe("market");
    expect(stop.side).toBe("sell");
    expect(stop.type).toBe("stop_market");
    expect(stop.reduceOnly).toBe(true);
    expect(stop.stopPrice).toBe(98);
    // 사이징: 리스크 50USD / 2 = 25 BTC (소수 6자리 절사)
    expect(entry.quantity).toBe(25);
  });

  it("enter short → 반대 방향 + stop 위쪽", () => {
    const out = buildIntentsForDecision(
      { action: "enter", side: "short", stopPrice: 102, reason: "x" },
      undefined,
      deps,
    );
    expect(out[0]?.side).toBe("sell");
    expect(out[1]?.side).toBe("buy");
    expect(out[1]?.stopPrice).toBe(102);
  });

  it("exit → reduceOnly market 청산 (포지션 수량 전체)", () => {
    const pos: Position = {
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "long",
      quantity: 0.5,
      entryPrice: 100,
      leverage: 1,
      unrealizedPnl: 0,
    };
    const out = buildIntentsForDecision({ action: "exit", reason: "x" }, pos, deps);
    expect(out).toHaveLength(1);
    expect(out[0]?.reduceOnly).toBe(true);
    expect(out[0]?.quantity).toBe(0.5);
  });

  it("partial_exit 0.5 → 절반 reduceOnly 청산", () => {
    const pos: Position = {
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "long",
      quantity: 1,
      entryPrice: 100,
      leverage: 1,
      unrealizedPnl: 0,
    };
    const out = buildIntentsForDecision({ action: "partial_exit", fraction: 0.5, reason: "x" }, pos, deps);
    expect(out[0]?.quantity).toBe(0.5);
    expect(out[0]?.reduceOnly).toBe(true);
  });

  it("clientOrderId 는 idPrefix + idSeq + suffix 로 멱등", () => {
    const out = buildIntentsForDecision(
      { action: "enter", side: "long", stopPrice: 98, reason: "x" },
      undefined,
      deps,
    );
    expect(out[0]?.clientOrderId).toBe("s1-1700000000000-entry");
    expect(out[1]?.clientOrderId).toBe("s1-1700000000000-stop");
  });
});
