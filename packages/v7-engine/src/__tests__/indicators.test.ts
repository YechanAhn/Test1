import { describe, it, expect } from "vitest";
import { sma, ema, rsi, atr, zScore } from "../indicators.js";

describe("sma", () => {
  it("정답 평균", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([1, 2, 3, 4, 5], 3)).toBe(4); // (3+4+5)/3
  });
  it("윈도 부족 시 undefined", () => {
    expect(sma([1, 2], 3)).toBeUndefined();
  });
});

describe("ema", () => {
  it("일관된 값 → 동일 값", () => {
    expect(ema([5, 5, 5, 5, 5], 3)).toBeCloseTo(5);
  });
  it("상승 추세에서 마지막 값에 가까워진다", () => {
    const v = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    expect(v).toBeGreaterThan(7);
    expect(v).toBeLessThan(10);
  });
});

describe("rsi", () => {
  it("계속 상승하면 100 에 수렴", () => {
    const v = rsi([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 14);
    expect(v).toBe(100);
  });
  it("계속 하락하면 0 에 가까움", () => {
    const v = rsi([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 14)!;
    expect(v).toBeLessThan(5);
  });
});

describe("atr", () => {
  it("일정한 ATR 계산", () => {
    const ohlc = Array.from({ length: 16 }, (_, i) => ({
      high: 10 + i,
      low: 9 + i,
      close: 9.5 + i,
    }));
    const v = atr(ohlc, 14)!;
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(2);
  });
});

describe("zScore", () => {
  it("모두 동일 → 0", () => {
    expect(zScore([5, 5, 5, 5, 5, 5], 5)).toBe(0);
  });
  it("스파이크 감지", () => {
    const v = zScore([10, 10, 10, 10, 10, 50], 5)!;
    expect(v).toBeGreaterThan(2);
  });
});
