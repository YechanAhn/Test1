import type { Position } from "@alrgo/core-types";
import { atr, ema, rsi, zScore, type OHLC } from "./indicators.js";

export interface MarketSnapshot {
  symbol: string;
  closes: number[]; // 1m closes (가장 짧은 타임프레임 기준)
  ohlc: OHLC[]; // 동일 길이
  volumes: number[]; // 동일 길이
  ts: number;
}

export interface StrategyParams {
  emaFast: number; // 20
  emaSlow: number; // 50
  rsiPeriod: number; // 14
  atrPeriod: number; // 14
  rsiLongMin: number; // 50 이상에서만 롱
  rsiShortMax: number; // 50 이하에서만 숏
  volumeZThreshold: number; // 1.5
  volumeZWindow: number; // 20
  atrStopMult: number; // 2.0
  partialTakeAtR: number; // 1.0R 부분익절
  partialFraction: number; // 0.5
  timeStopMs: number; // 8h
}

export const DEFAULT_PARAMS: StrategyParams = {
  emaFast: 20,
  emaSlow: 50,
  rsiPeriod: 14,
  atrPeriod: 14,
  rsiLongMin: 50,
  rsiShortMax: 50,
  volumeZThreshold: 1.5,
  volumeZWindow: 20,
  atrStopMult: 2.0,
  partialTakeAtR: 1.0,
  partialFraction: 0.5,
  timeStopMs: 8 * 60 * 60 * 1000,
};

export type Decision =
  | { action: "hold"; reason: string }
  | { action: "enter"; side: "long" | "short"; stopPrice: number; reason: string }
  | { action: "exit"; reason: string }
  | { action: "partial_exit"; fraction: number; reason: string };

export interface DecisionContext {
  snapshot: MarketSnapshot;
  position?: Position;
  /** 진입 시각(ms). 시간 스탑에 사용. */
  positionEnteredAt?: number;
  now: number;
  params?: Partial<StrategyParams>;
}

export function decide(ctx: DecisionContext): Decision {
  const p: StrategyParams = { ...DEFAULT_PARAMS, ...ctx.params };
  const { closes, volumes, ohlc } = ctx.snapshot;
  const efast = ema(closes, p.emaFast);
  const eslow = ema(closes, p.emaSlow);
  const r = rsi(closes, p.rsiPeriod);
  const a = atr(ohlc, p.atrPeriod);
  const vz = zScore(volumes, p.volumeZWindow);
  if (efast === undefined || eslow === undefined || r === undefined || a === undefined) {
    return { action: "hold", reason: "warmup" };
  }
  const last = closes[closes.length - 1]!;

  // 1) 보유 중이면 청산 로직 우선
  if (ctx.position) {
    if (ctx.positionEnteredAt !== undefined && ctx.now - ctx.positionEnteredAt > p.timeStopMs) {
      return { action: "exit", reason: "time_stop" };
    }
    // 시그널이 반대로 뒤집히면 즉시 청산
    if (ctx.position.side === "long" && efast < eslow) {
      return { action: "exit", reason: "trend_flip" };
    }
    if (ctx.position.side === "short" && efast > eslow) {
      return { action: "exit", reason: "trend_flip" };
    }
    // 1R 도달 시 부분 익절
    const stopDist = a * p.atrStopMult;
    const reward = Math.abs(last - ctx.position.entryPrice);
    if (reward >= stopDist * p.partialTakeAtR) {
      return { action: "partial_exit", fraction: p.partialFraction, reason: "1R" };
    }
    return { action: "hold", reason: "in_position" };
  }

  // 2) 진입: 트렌드 + 모멘텀 + 거래량 컨펌
  if (vz === undefined || vz < p.volumeZThreshold) {
    return { action: "hold", reason: "low_volume" };
  }
  const stopDist = a * p.atrStopMult;
  if (efast > eslow && r >= p.rsiLongMin) {
    return { action: "enter", side: "long", stopPrice: last - stopDist, reason: "trend_long" };
  }
  if (efast < eslow && r <= p.rsiShortMax) {
    return { action: "enter", side: "short", stopPrice: last + stopDist, reason: "trend_short" };
  }
  return { action: "hold", reason: "no_signal" };
}
