import { describe, it, expect } from "vitest";
import type { IExchange } from "../IExchange.js";

/** 임의의 IExchange 구현체가 동일하게 만족해야 할 행동 계약. */
export function iExchangeContract(name: string, factory: () => IExchange): void {
  describe(`IExchange contract — ${name}`, () => {
    it("normalizeSymbol/parseSymbol 라운드트립", () => {
      const x = factory();
      const native = x.normalizeSymbol("BTC/USDT:USDT");
      expect(typeof native).toBe("string");
      // round-trip 은 거래소 표기를 다시 통일심볼로 돌릴 수 있어야 한다
      const back = x.parseSymbol(native);
      expect(back).toBe("BTC/USDT:USDT");
    });
  });
}
