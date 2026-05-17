import { describe, it, expect } from "vitest";
import { binance, bybit, parseUnified } from "../common/symbol.js";

describe("parseUnified", () => {
  it("BTC/USDT:USDT 를 분해한다", () => {
    expect(parseUnified("BTC/USDT:USDT")).toEqual({ base: "BTC", quote: "USDT", settle: "USDT" });
  });
  it("잘못된 포맷은 throw", () => {
    expect(() => parseUnified("BTCUSDT")).toThrow();
  });
});

describe("binance symbol", () => {
  it("fromUnified", () => {
    expect(binance.fromUnified("BTC/USDT:USDT")).toBe("BTCUSDT");
    expect(binance.fromUnified("ETH/USDT:USDT")).toBe("ETHUSDT");
  });
  it("toUnified", () => {
    expect(binance.toUnified("BTCUSDT")).toBe("BTC/USDT:USDT");
    expect(binance.toUnified("ETHUSDT")).toBe("ETH/USDT:USDT");
  });
});

describe("bybit symbol", () => {
  it("round-trip", () => {
    expect(bybit.toUnified(bybit.fromUnified("BTC/USDT:USDT"))).toBe("BTC/USDT:USDT");
  });
});
