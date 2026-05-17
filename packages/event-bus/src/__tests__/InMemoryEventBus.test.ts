import { describe, it, expect, vi } from "vitest";
import { InMemoryEventBus } from "../InMemoryEventBus.js";

describe("InMemoryEventBus", () => {
  it("정확한 토픽 구독자에게 페이로드 전달", async () => {
    const bus = new InMemoryEventBus();
    const seen: unknown[] = [];
    bus.subscribe("trader.order", (p) => {
      seen.push(p);
    });
    await bus.publish("trader.order", {
      shardId: "s1",
      intent: {
        clientOrderId: "c1",
        exchange: "binance-futures",
        symbol: "BTC/USDT:USDT",
        side: "buy",
        type: "market",
        quantity: 1,
      },
    });
    expect(seen).toHaveLength(1);
  });

  it("unsubscribe 후에는 더 이상 전달되지 않는다", async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    const off = bus.subscribe("watcher.alert", handler);
    await bus.publish("watcher.alert", { severity: "info", message: "x" });
    off();
    await bus.publish("watcher.alert", { severity: "info", message: "y" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("와일드카드 구독은 prefix 매칭", async () => {
    const bus = new InMemoryEventBus();
    const seen: string[] = [];
    bus.subscribePattern("trader.*", (t) => {
      seen.push(t);
    });
    await bus.publish("trader.fill", {
      shardId: "s1",
      ack: {
        clientOrderId: "c1",
        exchangeOrderId: "e1",
        exchange: "binance-futures",
        symbol: "BTC/USDT:USDT",
        acceptedAt: 0,
      },
      fillPrice: 100,
      fillQty: 1,
    });
    await bus.publish("watcher.alert", { severity: "info", message: "z" });
    expect(seen).toEqual(["trader.fill"]);
  });

  it("close 후 publish 는 throw", async () => {
    const bus = new InMemoryEventBus();
    await bus.close();
    await expect(bus.publish("logs.info", { topic: "t", message: "m", ts: 0 })).rejects.toThrow();
  });

  it("처리량 — 1만 메시지를 1초 이내 소화", async () => {
    const bus = new InMemoryEventBus();
    let count = 0;
    bus.subscribe("logs.info", () => {
      count++;
    });
    const N = 10_000;
    const start = Date.now();
    for (let i = 0; i < N; i++) {
      await bus.publish("logs.info", { topic: "t", message: "m", ts: i });
    }
    const elapsed = Date.now() - start;
    expect(count).toBe(N);
    expect(elapsed).toBeLessThan(1000);
  });
});
