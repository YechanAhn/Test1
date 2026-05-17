import type { ExchangeId, OrderAck, OrderIntent, Position } from "@alrgo/core-types";

export interface AccountBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface AccountInfo {
  exchange: ExchangeId;
  balances: AccountBalance[];
  positions: Position[];
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface KlinesQuery {
  symbol: string;
  interval: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
  limit?: number;
  startTime?: number;
  endTime?: number;
}

/** 자체 작성한 CCXT-style 인터페이스. 외부 magic 라이브러리 의존 X. */
export interface IExchange {
  readonly id: ExchangeId;

  createOrder(intent: OrderIntent): Promise<OrderAck>;
  cancelOrder(args: { symbol: string; clientOrderId: string }): Promise<void>;
  cancelAll(symbol?: string): Promise<void>;

  getAccount(): Promise<AccountInfo>;
  getPositions(): Promise<Position[]>;
  getOpenOrders(symbol?: string): Promise<OrderAck[]>;
  getKlines(q: KlinesQuery): Promise<Kline[]>;

  /** 거래소 고유 심볼 ↔ 통일 심볼 변환을 모든 외부 입력에 적용한다. */
  normalizeSymbol(unified: string): string;
  parseSymbol(native: string): string;
}
