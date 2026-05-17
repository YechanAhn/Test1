import { describe, it, expect, vi } from "vitest";
import { BybitFutures } from "../bybit/index.js";
import type { Fetcher } from "../common/fetcher.js";
import { iExchangeContract } from "./IExchange.contract.js";

function exchange(fetcher: Fetcher) {
  return new BybitFutures({
    key: "K",
    secret: "S",
    testnet: true,
    fetcher,
    now: () => 1700000000000,
  });
}

iExchangeContract("BybitFutures", () =>
  exchange(async () => ({ status: 200, body: { retCode: 0, result: {} } })),
);

describe("BybitFutures.createOrder", () => {
  it("v5/order/create 로 POST + 서명 헤더 셋", async () => {
    const fetcher = vi.fn<Parameters<Fetcher>, ReturnType<Fetcher>>().mockResolvedValue({
      status: 200,
      body: { retCode: 0, result: { orderId: "abc", orderLinkId: "cli-1" } },
    });
    const ex = exchange(fetcher);
    const ack = await ex.createOrder({
      clientOrderId: "cli-1",
      exchange: "bybit-futures",
      symbol: "BTC/USDT:USDT",
      side: "sell",
      type: "limit",
      quantity: 0.01,
      price: 30000,
    });
    expect(ack.exchangeOrderId).toBe("abc");
    const req = fetcher.mock.calls[0]?.[0];
    expect(req?.method).toBe("POST");
    expect(req?.url).toContain("api-testnet.bybit.com/v5/order/create");
    expect(req?.headers?.["X-BAPI-API-KEY"]).toBe("K");
    expect(req?.headers?.["X-BAPI-SIGN"]).toMatch(/^[a-f0-9]{64}$/);
    const body = JSON.parse(req!.body!);
    expect(body.symbol).toBe("BTCUSDT");
    expect(body.side).toBe("Sell");
    expect(body.orderType).toBe("Limit");
  });

  it("retCode != 0 은 ExchangeError 로 던진다", async () => {
    const fetcher: Fetcher = async () => ({
      status: 200,
      body: { retCode: 10001, retMsg: "invalid" },
    });
    const ex = exchange(fetcher);
    await expect(
      ex.createOrder({
        clientOrderId: "cli-1",
        exchange: "bybit-futures",
        symbol: "BTC/USDT:USDT",
        side: "buy",
        type: "market",
        quantity: 0.01,
      }),
    ).rejects.toMatchObject({ name: "ExchangeError" });
  });
});
