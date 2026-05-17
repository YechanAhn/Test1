import { describe, it, expect, vi } from "vitest";
import { BinanceFutures } from "../binance/index.js";
import type { Fetcher } from "../common/fetcher.js";
import { iExchangeContract } from "./IExchange.contract.js";

function exchange(fetcher: Fetcher) {
  return new BinanceFutures({
    key: "K",
    secret: "S",
    testnet: true,
    fetcher,
    now: () => 1700000000000,
  });
}

iExchangeContract("BinanceFutures", () => exchange(async () => ({ status: 200, body: {} })));

describe("BinanceFutures.createOrder", () => {
  it("signed POST 를 보내고 OrderAck 로 매핑한다", async () => {
    const fetcher = vi.fn<Parameters<Fetcher>, ReturnType<Fetcher>>().mockResolvedValue({
      status: 200,
      body: {
        orderId: 999,
        clientOrderId: "cli-1",
        symbol: "BTCUSDT",
        updateTime: 1700000000123,
      },
    });
    const ex = exchange(fetcher);
    const ack = await ex.createOrder({
      clientOrderId: "cli-1",
      exchange: "binance-futures",
      symbol: "BTC/USDT:USDT",
      side: "buy",
      type: "market",
      quantity: 0.01,
    });
    expect(ack.exchangeOrderId).toBe("999");
    expect(ack.exchange).toBe("binance-futures");
    expect(ack.symbol).toBe("BTC/USDT:USDT");

    const req = fetcher.mock.calls[0]?.[0];
    expect(req?.method).toBe("POST");
    expect(req?.url).toContain("testnet.binancefuture.com/fapi/v1/order");
    expect(req?.url).toContain("symbol=BTCUSDT");
    expect(req?.url).toContain("signature=");
    expect(req?.headers?.["X-MBX-APIKEY"]).toBe("K");
  });

  it("HTTP 4xx 는 ExchangeError 로 분류", async () => {
    const fetcher: Fetcher = async () => ({ status: 400, body: { code: -2010, msg: "no balance" } });
    const ex = exchange(fetcher);
    await expect(
      ex.createOrder({
        clientOrderId: "cli-1",
        exchange: "binance-futures",
        symbol: "BTC/USDT:USDT",
        side: "buy",
        type: "market",
        quantity: 1,
      }),
    ).rejects.toMatchObject({ name: "ExchangeError", code: "INSUFFICIENT_BALANCE" });
  });
});

describe("BinanceFutures.getAccount", () => {
  it("positionAmt 부호로 long/short 를 결정한다", async () => {
    const fetcher: Fetcher = async () => ({
      status: 200,
      body: {
        assets: [{ asset: "USDT", walletBalance: "100" }],
        positions: [
          { symbol: "BTCUSDT", positionAmt: "0.5", entryPrice: "30000", leverage: "3", unrealizedProfit: "10" },
          { symbol: "ETHUSDT", positionAmt: "-1", entryPrice: "2000", leverage: "5", unrealizedProfit: "-5" },
          { symbol: "BNBUSDT", positionAmt: "0", entryPrice: "0", leverage: "1", unrealizedProfit: "0" },
        ],
      },
    });
    const ex = exchange(fetcher);
    const acct = await ex.getAccount();
    expect(acct.balances).toEqual([{ asset: "USDT", free: 100, locked: 0 }]);
    expect(acct.positions).toHaveLength(2);
    expect(acct.positions[0]?.side).toBe("long");
    expect(acct.positions[1]?.side).toBe("short");
  });
});
