import { describe, it, expect } from "vitest";
import { classifyHttp } from "../common/errors.js";

describe("classifyHttp", () => {
  it("401 → AUTH (non-retryable)", () => {
    const e = classifyHttp(401);
    expect(e.code).toBe("AUTH");
    expect(e.retryable).toBe(false);
  });
  it("429 → RATE_LIMIT (retryable)", () => {
    const e = classifyHttp(429);
    expect(e.code).toBe("RATE_LIMIT");
    expect(e.retryable).toBe(true);
  });
  it("5xx → EXCHANGE_5XX (retryable)", () => {
    const e = classifyHttp(503);
    expect(e.code).toBe("EXCHANGE_5XX");
    expect(e.retryable).toBe(true);
  });
  it("Binance code -2010 → INSUFFICIENT_BALANCE", () => {
    const e = classifyHttp(400, { code: -2010, msg: "no balance" });
    expect(e.code).toBe("INSUFFICIENT_BALANCE");
  });
  it("Bybit retCode 110007 → INSUFFICIENT_BALANCE", () => {
    const e = classifyHttp(200, { retCode: 110007 });
    expect(e.code).toBe("INSUFFICIENT_BALANCE");
  });
});
