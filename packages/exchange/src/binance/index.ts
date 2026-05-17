import type { ExchangeId, OrderAck, OrderIntent, Position } from "@alrgo/core-types";
import type { AccountInfo, IExchange, Kline, KlinesQuery } from "../IExchange.js";
import { classifyHttp } from "../common/errors.js";
import { type Fetcher } from "../common/fetcher.js";
import { hmacSha256Hex, toQueryString } from "../common/hmac.js";
import { TokenBucket } from "../common/ratelimit.js";
import { binance } from "../common/symbol.js";

export interface BinanceConfig {
  key: string;
  secret: string;
  testnet: boolean;
  fetcher: Fetcher;
  now?: () => number;
  rateLimit?: { capacity: number; refillPerSec: number };
}

const BASE_PROD = "https://fapi.binance.com";
const BASE_TEST = "https://testnet.binancefuture.com";

export class BinanceFutures implements IExchange {
  readonly id: ExchangeId = "binance-futures";
  private readonly base: string;
  private readonly bucket: TokenBucket;
  private readonly now: () => number;

  constructor(private readonly cfg: BinanceConfig) {
    this.base = cfg.testnet ? BASE_TEST : BASE_PROD;
    this.now = cfg.now ?? Date.now;
    const rl = cfg.rateLimit ?? { capacity: 1200, refillPerSec: 1200 / 60 };
    this.bucket = new TokenBucket(rl.capacity, rl.refillPerSec);
  }

  normalizeSymbol(unified: string): string {
    return binance.fromUnified(unified);
  }
  parseSymbol(native: string): string {
    return binance.toUnified(native);
  }

  private async signedRequest<T>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    await this.bucket.take(1);
    const ts = this.now();
    const merged = { ...params, timestamp: ts, recvWindow: 5000 };
    const qs = toQueryString(merged);
    const signature = hmacSha256Hex(this.cfg.secret, qs);
    const url = `${this.base}${path}?${qs}&signature=${signature}`;
    const res = await this.cfg.fetcher({
      method,
      url,
      headers: { "X-MBX-APIKEY": this.cfg.key },
    });
    if (res.status >= 400) throw classifyHttp(res.status, res.body as { code?: number; msg?: string });
    return res.body as T;
  }

  private async publicRequest<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    await this.bucket.take(1);
    const qs = toQueryString(params);
    const url = qs ? `${this.base}${path}?${qs}` : `${this.base}${path}`;
    const res = await this.cfg.fetcher({ method: "GET", url });
    if (res.status >= 400) throw classifyHttp(res.status, res.body as { code?: number; msg?: string });
    return res.body as T;
  }

  async createOrder(intent: OrderIntent): Promise<OrderAck> {
    const params: Record<string, string | number | boolean | undefined> = {
      symbol: this.normalizeSymbol(intent.symbol),
      side: intent.side.toUpperCase(),
      type: typeMap(intent.type),
      quantity: intent.quantity,
      newClientOrderId: intent.clientOrderId,
      reduceOnly: intent.reduceOnly,
    };
    if (intent.price !== undefined) params.price = intent.price;
    if (intent.stopPrice !== undefined) params.stopPrice = intent.stopPrice;
    if (intent.timeInForce) params.timeInForce = intent.timeInForce === "PO" ? "GTX" : intent.timeInForce;
    const raw = await this.signedRequest<{ orderId: number; clientOrderId: string; symbol: string; updateTime: number }>(
      "POST",
      "/fapi/v1/order",
      params,
    );
    return {
      clientOrderId: raw.clientOrderId,
      exchangeOrderId: String(raw.orderId),
      exchange: this.id,
      symbol: intent.symbol,
      acceptedAt: raw.updateTime ?? this.now(),
    };
  }

  async cancelOrder(args: { symbol: string; clientOrderId: string }): Promise<void> {
    await this.signedRequest("DELETE", "/fapi/v1/order", {
      symbol: this.normalizeSymbol(args.symbol),
      origClientOrderId: args.clientOrderId,
    });
  }

  async cancelAll(symbol?: string): Promise<void> {
    if (!symbol) return; // Binance 는 심볼 단위로만 cancel-all
    await this.signedRequest("DELETE", "/fapi/v1/allOpenOrders", {
      symbol: this.normalizeSymbol(symbol),
    });
  }

  async getAccount(): Promise<AccountInfo> {
    const raw = await this.signedRequest<{ assets: { asset: string; walletBalance: string; }[]; positions: { symbol: string; positionAmt: string; entryPrice: string; leverage: string; unrealizedProfit: string }[] }>(
      "GET",
      "/fapi/v2/account",
    );
    const positions: Position[] = raw.positions
      .filter((p) => Number(p.positionAmt) !== 0)
      .map((p) => ({
        exchange: this.id,
        symbol: this.parseSymbol(p.symbol),
        side: Number(p.positionAmt) > 0 ? "long" : "short",
        quantity: Math.abs(Number(p.positionAmt)),
        entryPrice: Number(p.entryPrice),
        leverage: Number(p.leverage),
        unrealizedPnl: Number(p.unrealizedProfit),
      }));
    return {
      exchange: this.id,
      balances: raw.assets.map((a) => ({ asset: a.asset, free: Number(a.walletBalance), locked: 0 })),
      positions,
    };
  }

  async getPositions(): Promise<Position[]> {
    return (await this.getAccount()).positions;
  }

  async getOpenOrders(symbol?: string): Promise<OrderAck[]> {
    const params = symbol ? { symbol: this.normalizeSymbol(symbol) } : {};
    const raw = await this.signedRequest<{ orderId: number; clientOrderId: string; symbol: string; updateTime: number }[]>(
      "GET",
      "/fapi/v1/openOrders",
      params,
    );
    return raw.map((o) => ({
      clientOrderId: o.clientOrderId,
      exchangeOrderId: String(o.orderId),
      exchange: this.id,
      symbol: this.parseSymbol(o.symbol),
      acceptedAt: o.updateTime,
    }));
  }

  async getKlines(q: KlinesQuery): Promise<Kline[]> {
    const raw = await this.publicRequest<unknown[][]>("/fapi/v1/klines", {
      symbol: this.normalizeSymbol(q.symbol),
      interval: q.interval,
      limit: q.limit,
      startTime: q.startTime,
      endTime: q.endTime,
    });
    return raw.map((arr) => ({
      openTime: arr[0] as number,
      open: Number(arr[1]),
      high: Number(arr[2]),
      low: Number(arr[3]),
      close: Number(arr[4]),
      volume: Number(arr[5]),
      closeTime: arr[6] as number,
    }));
  }
}

function typeMap(t: OrderIntent["type"]): string {
  switch (t) {
    case "market":
      return "MARKET";
    case "limit":
      return "LIMIT";
    case "stop":
      return "STOP";
    case "stop_market":
      return "STOP_MARKET";
    case "take_profit":
      return "TAKE_PROFIT";
  }
}
