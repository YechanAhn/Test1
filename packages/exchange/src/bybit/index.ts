import type { ExchangeId, OrderAck, OrderIntent, Position } from "@alrgo/core-types";
import type { AccountInfo, IExchange, Kline, KlinesQuery } from "../IExchange.js";
import { classifyHttp, ExchangeError } from "../common/errors.js";
import { type Fetcher } from "../common/fetcher.js";
import { hmacSha256Hex } from "../common/hmac.js";
import { TokenBucket } from "../common/ratelimit.js";
import { bybit } from "../common/symbol.js";

export interface BybitConfig {
  key: string;
  secret: string;
  testnet: boolean;
  fetcher: Fetcher;
  now?: () => number;
  rateLimit?: { capacity: number; refillPerSec: number };
}

const BASE_PROD = "https://api.bybit.com";
const BASE_TEST = "https://api-testnet.bybit.com";

export class BybitFutures implements IExchange {
  readonly id: ExchangeId = "bybit-futures";
  private readonly base: string;
  private readonly bucket: TokenBucket;
  private readonly now: () => number;

  constructor(private readonly cfg: BybitConfig) {
    this.base = cfg.testnet ? BASE_TEST : BASE_PROD;
    this.now = cfg.now ?? Date.now;
    const rl = cfg.rateLimit ?? { capacity: 120, refillPerSec: 20 };
    this.bucket = new TokenBucket(rl.capacity, rl.refillPerSec);
  }

  normalizeSymbol(unified: string): string {
    return bybit.fromUnified(unified);
  }
  parseSymbol(native: string): string {
    return bybit.toUnified(native);
  }

  private sign(ts: number, recv: number, payload: string): string {
    return hmacSha256Hex(this.cfg.secret, `${ts}${this.cfg.key}${recv}${payload}`);
  }

  private async signedRequest<T>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, unknown> = {}): Promise<T> {
    await this.bucket.take(1);
    const ts = this.now();
    const recv = 5000;
    const body = method === "GET" || method === "DELETE"
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join("&")
      : JSON.stringify(params);
    const signature = this.sign(ts, recv, body);
    const url = method === "GET" || method === "DELETE"
      ? body ? `${this.base}${path}?${body}` : `${this.base}${path}`
      : `${this.base}${path}`;
    const headers: Record<string, string> = {
      "X-BAPI-API-KEY": this.cfg.key,
      "X-BAPI-TIMESTAMP": String(ts),
      "X-BAPI-RECV-WINDOW": String(recv),
      "X-BAPI-SIGN": signature,
    };
    if (method === "POST") headers["Content-Type"] = "application/json";
    const res = await this.cfg.fetcher({
      method,
      url,
      headers,
      body: method === "POST" ? body : undefined,
    });
    if (res.status >= 400) throw classifyHttp(res.status, res.body as { retCode?: number; retMsg?: string });
    const parsed = res.body as { retCode: number; retMsg?: string; result?: T };
    if (parsed.retCode !== 0) throw new ExchangeError("UNKNOWN", parsed.retMsg ?? `retCode ${parsed.retCode}`, false, parsed);
    return parsed.result as T;
  }

  async createOrder(intent: OrderIntent): Promise<OrderAck> {
    const raw = await this.signedRequest<{ orderId: string; orderLinkId: string }>(
      "POST",
      "/v5/order/create",
      {
        category: "linear",
        symbol: this.normalizeSymbol(intent.symbol),
        side: intent.side === "buy" ? "Buy" : "Sell",
        orderType: intent.type === "market" ? "Market" : "Limit",
        qty: String(intent.quantity),
        price: intent.price !== undefined ? String(intent.price) : undefined,
        orderLinkId: intent.clientOrderId,
        reduceOnly: intent.reduceOnly,
        timeInForce: intent.timeInForce === "PO" ? "PostOnly" : intent.timeInForce ?? "GTC",
      },
    );
    return {
      clientOrderId: raw.orderLinkId ?? intent.clientOrderId,
      exchangeOrderId: raw.orderId,
      exchange: this.id,
      symbol: intent.symbol,
      acceptedAt: this.now(),
    };
  }

  async cancelOrder(args: { symbol: string; clientOrderId: string }): Promise<void> {
    await this.signedRequest("POST", "/v5/order/cancel", {
      category: "linear",
      symbol: this.normalizeSymbol(args.symbol),
      orderLinkId: args.clientOrderId,
    });
  }

  async cancelAll(symbol?: string): Promise<void> {
    await this.signedRequest("POST", "/v5/order/cancel-all", {
      category: "linear",
      symbol: symbol ? this.normalizeSymbol(symbol) : undefined,
    });
  }

  async getAccount(): Promise<AccountInfo> {
    const wallet = await this.signedRequest<{ list: { coin: { coin: string; walletBalance: string; locked: string }[] }[] }>(
      "GET",
      "/v5/account/wallet-balance",
      { accountType: "UNIFIED" },
    );
    const pos = await this.getPositions();
    const balances = (wallet.list[0]?.coin ?? []).map((c) => ({
      asset: c.coin,
      free: Number(c.walletBalance) - Number(c.locked),
      locked: Number(c.locked),
    }));
    return { exchange: this.id, balances, positions: pos };
  }

  async getPositions(): Promise<Position[]> {
    const res = await this.signedRequest<{ list: { symbol: string; side: string; size: string; entryPrice: string; leverage: string; unrealisedPnl: string }[] }>(
      "GET",
      "/v5/position/list",
      { category: "linear", settleCoin: "USDT" },
    );
    return res.list
      .filter((p) => Number(p.size) > 0)
      .map((p) => ({
        exchange: this.id,
        symbol: this.parseSymbol(p.symbol),
        side: p.side === "Buy" ? "long" : "short",
        quantity: Number(p.size),
        entryPrice: Number(p.entryPrice),
        leverage: Number(p.leverage),
        unrealizedPnl: Number(p.unrealisedPnl),
      }));
  }

  async getOpenOrders(symbol?: string): Promise<OrderAck[]> {
    const res = await this.signedRequest<{ list: { orderId: string; orderLinkId: string; symbol: string; updatedTime: string }[] }>(
      "GET",
      "/v5/order/realtime",
      { category: "linear", symbol: symbol ? this.normalizeSymbol(symbol) : undefined },
    );
    return res.list.map((o) => ({
      clientOrderId: o.orderLinkId,
      exchangeOrderId: o.orderId,
      exchange: this.id,
      symbol: this.parseSymbol(o.symbol),
      acceptedAt: Number(o.updatedTime),
    }));
  }

  async getKlines(q: KlinesQuery): Promise<Kline[]> {
    await this.bucket.take(1);
    const params = new URLSearchParams({
      category: "linear",
      symbol: this.normalizeSymbol(q.symbol),
      interval: intervalMap(q.interval),
    });
    if (q.limit) params.set("limit", String(q.limit));
    if (q.startTime) params.set("start", String(q.startTime));
    if (q.endTime) params.set("end", String(q.endTime));
    const res = await this.cfg.fetcher({ method: "GET", url: `${this.base}/v5/market/kline?${params}` });
    if (res.status >= 400) throw classifyHttp(res.status, res.body as { retCode?: number });
    const parsed = res.body as { result: { list: string[][] } };
    return parsed.result.list.map((arr) => ({
      openTime: Number(arr[0]),
      open: Number(arr[1]),
      high: Number(arr[2]),
      low: Number(arr[3]),
      close: Number(arr[4]),
      volume: Number(arr[5]),
      closeTime: Number(arr[0]) + intervalMs(q.interval),
    }));
  }
}

function intervalMap(i: KlinesQuery["interval"]): string {
  switch (i) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "15m":
      return "15";
    case "1h":
      return "60";
    case "4h":
      return "240";
    case "1d":
      return "D";
  }
}

function intervalMs(i: KlinesQuery["interval"]): number {
  switch (i) {
    case "1m":
      return 60_000;
    case "5m":
      return 300_000;
    case "15m":
      return 900_000;
    case "1h":
      return 3_600_000;
    case "4h":
      return 14_400_000;
    case "1d":
      return 86_400_000;
  }
}
