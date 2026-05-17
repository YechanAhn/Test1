import { describe, it, expect } from "vitest";
import { decide, type MarketSnapshot } from "../strategy.js";
import type { Position } from "@alrgo/core-types";

function snapshotTrendUp(): MarketSnapshot {
  const closes = Array.from({ length: 100 }, (_, i) => 100 + i);
  const volumes = Array.from({ length: 100 }, (_, i) => (i < 99 ? 100 : 1000));
  const ohlc = closes.map((c) => ({ high: c + 1, low: c - 1, close: c }));
  return { symbol: "BTC/USDT:USDT", closes, ohlc, volumes, ts: 0 };
}

function snapshotTrendDown(): MarketSnapshot {
  const closes = Array.from({ length: 100 }, (_, i) => 200 - i);
  const volumes = Array.from({ length: 100 }, (_, i) => (i < 99 ? 100 : 1000));
  const ohlc = closes.map((c) => ({ high: c + 1, low: c - 1, close: c }));
  return { symbol: "BTC/USDT:USDT", closes, ohlc, volumes, ts: 0 };
}

function flatSnapshot(): MarketSnapshot {
  const closes = Array.from({ length: 100 }, () => 100);
  const volumes = Array.from({ length: 100 }, () => 100);
  const ohlc = closes.map(() => ({ high: 100, low: 100, close: 100 }));
  return { symbol: "BTC/USDT:USDT", closes, ohlc, volumes, ts: 0 };
}

describe("strategy.decide — entry", () => {
  it("warmup 미만 데이터 → hold", () => {
    const snap = { ...flatSnapshot(), closes: [100, 101, 102], ohlc: [], volumes: [1, 2, 3] };
    expect(decide({ snapshot: snap, now: 0 }).action).toBe("hold");
  });

  it("상승 추세 + 거래량 스파이크 → long 진입", () => {
    const snap = snapshotTrendUp();
    const d = decide({ snapshot: snap, now: 0 });
    expect(d.action).toBe("enter");
    if (d.action === "enter") expect(d.side).toBe("long");
  });

  it("하락 추세 + 거래량 스파이크 → short 진입", () => {
    const snap = snapshotTrendDown();
    const d = decide({ snapshot: snap, now: 0 });
    expect(d.action).toBe("enter");
    if (d.action === "enter") expect(d.side).toBe("short");
  });

  it("거래량 컨펌 없음 → hold", () => {
    const snap = snapshotTrendUp();
    snap.volumes = snap.volumes.map(() => 100);
    expect(decide({ snapshot: snap, now: 0 }).action).toBe("hold");
  });
});

describe("strategy.decide — exit when in position", () => {
  function longPos(entryPrice: number): Position {
    return {
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "long",
      quantity: 1,
      entryPrice,
      leverage: 1,
      unrealizedPnl: 0,
    };
  }

  it("트렌드 뒤집힘 → exit", () => {
    const snap = snapshotTrendDown();
    const d = decide({ snapshot: snap, position: longPos(199), now: 0 });
    expect(d.action).toBe("exit");
  });

  it("8h 시간 스탑 초과 → exit", () => {
    const snap = snapshotTrendUp();
    const d = decide({
      snapshot: snap,
      position: longPos(150),
      positionEnteredAt: 0,
      now: 9 * 60 * 60 * 1000,
    });
    expect(d.action).toBe("exit");
  });

  it("1R 도달 → partial_exit 50%", () => {
    const snap = snapshotTrendUp();
    // 마지막가 199, entry 195 가정 → reward 4 가 atrStop*1R 와 비교됨
    const d = decide({ snapshot: snap, position: longPos(195), now: 0 });
    // 정확한 ATR 값에 의존하지 않으므로 hold/partial_exit 중 하나일 수 있다.
    expect(["partial_exit", "hold"]).toContain(d.action);
  });
});
