export type ExchangeId = "binance-futures" | "bybit-futures";
export type Side = "long" | "short";
export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_market" | "take_profit";
export type TimeInForce = "GTC" | "IOC" | "FOK" | "PO";

export type CommandKind =
  | "START"
  | "STOP"
  | "PAUSE"
  | "RESUME"
  | "FLATTEN_ALL"
  | "CANCEL_ALL"
  | "KILL"
  | "STRATEGY_UPDATE";

export interface Command {
  id: string;
  ownerUid: string;
  kind: CommandKind;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  createdAt: number;
}

export interface OrderIntent {
  clientOrderId: string;
  exchange: ExchangeId;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: TimeInForce;
}

export interface OrderAck {
  clientOrderId: string;
  exchangeOrderId: string;
  exchange: ExchangeId;
  symbol: string;
  acceptedAt: number;
}

export interface Position {
  exchange: ExchangeId;
  symbol: string;
  side: Side;
  quantity: number;
  entryPrice: number;
  leverage: number;
  unrealizedPnl: number;
}

export interface RiskBreach {
  code:
    | "MAX_NOTIONAL"
    | "MAX_LEVERAGE"
    | "MAX_DRAWDOWN"
    | "KILL_SWITCH_DRAWDOWN"
    | "LATENCY_BUDGET"
    | "STRATEGY_REJECT";
  message: string;
  context?: Record<string, unknown>;
}

export interface ShardState {
  shardId: string;
  ownerUid: string;
  status: "BOOTING" | "RUNNING" | "PAUSED" | "DRAINING" | "DOWN";
  heartbeatAt: number;
  positions: Position[];
  openOrders: OrderAck[];
  pnlSession: number;
  drawdownPct: number;
}

export interface Snapshot {
  id: string;
  ownerUid: string;
  ts: number;
  shardStates: ShardState[];
  cause: "PERIODIC" | "ORDER" | "FILL" | "RISK" | "KILL" | "FAILOVER";
}

export const TOPICS = {
  trader: {
    order: "trader.order",
    fill: "trader.fill",
    position: "trader.position",
  },
  watcher: {
    alert: "watcher.alert",
    risk: "watcher.risk",
  },
  dashboard: {
    state: "dashboard.state",
    delta: "dashboard.delta",
  },
  logs: {
    info: "logs.info",
    error: "logs.error",
  },
  health: {
    heartbeat: "health.heartbeat",
  },
  failover: {
    trigger: "failover.trigger",
  },
  kill: {
    switch: "kill.switch",
  },
} as const;
