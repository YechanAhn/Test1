import { describe, it, expect } from "vitest";
import { MockExchange } from "../mock/MockExchange.js";
import { iExchangeContract } from "./IExchange.contract.js";

iExchangeContract("MockExchange", () => {
  const ex = new MockExchange();
  // mock 은 통일심볼을 그대로 native 로 사용한다
  ex.setPrice("BTC/USDT:USDT", 30000);
  return ex;
});

describe("MockExchange", () => {
  it("market buy 시 포지션이 새로 생성된다", async () => {
    const ex = new MockExchange();
    ex.setPrice("BTC/USDT:USDT", 30000);
    await ex.createOrder({
      clientOrderId: "c1",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 0.1,
    });
    const pos = await ex.getPositions();
    expect(pos).toHaveLength(1);
    expect(pos[0]?.side).toBe("long");
    expect(pos[0]?.entryPrice).toBe(30000);
  });

  it("동일 방향 추가 매수 시 평단이 가중 평균된다", async () => {
    const ex = new MockExchange();
    ex.setPrice("BTC/USDT:USDT", 30000);
    await ex.createOrder({
      clientOrderId: "c1",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 1,
    });
    ex.setPrice("BTC/USDT:USDT", 40000);
    await ex.createOrder({
      clientOrderId: "c2",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 1,
    });
    const pos = await ex.getPositions();
    expect(pos[0]?.quantity).toBe(2);
    expect(pos[0]?.entryPrice).toBe(35000);
  });

  it("반대 방향이 잔량을 줄이고 0 이 되면 포지션을 닫는다", async () => {
    const ex = new MockExchange();
    ex.setPrice("BTC/USDT:USDT", 30000);
    await ex.createOrder({
      clientOrderId: "c1",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 1,
    });
    await ex.createOrder({
      clientOrderId: "c2",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "sell",
      type: "market",
      quantity: 1,
    });
    expect(await ex.getPositions()).toHaveLength(0);
  });
});
