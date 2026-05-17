/**
 * 결정론적 단순 지표. NaN 회피, 윈도 부족 시 undefined 반환.
 * 모든 지표는 closing prices(혹은 OHLC) 의 시간순 배열을 입력으로 받는다.
 */

export function sma(values: readonly number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i]!;
  return sum / period;
}

export function ema(values: readonly number[], period: number): number | undefined {
  if (period <= 0 || values.length < period) return undefined;
  const k = 2 / (period + 1);
  // seed: 첫 period 의 SMA
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i]!;
  prev /= period;
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
  }
  return prev;
}

/** Wilder RSI(period). 표준 정의. */
export function rsi(values: readonly number[], period = 14): number | undefined {
  if (values.length <= period) return undefined;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i]! - values[i - 1]!;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export interface OHLC {
  high: number;
  low: number;
  close: number;
}

/** Wilder ATR(period). True Range 의 wilder smoothing. */
export function atr(ohlc: readonly OHLC[], period = 14): number | undefined {
  if (ohlc.length <= period) return undefined;
  const tr: number[] = [];
  for (let i = 1; i < ohlc.length; i++) {
    const cur = ohlc[i]!;
    const prev = ohlc[i - 1]!;
    tr.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)));
  }
  // 첫 period 평균 → 이후 wilder 평활
  let prev = 0;
  for (let i = 0; i < period; i++) prev += tr[i]!;
  prev /= period;
  for (let i = period; i < tr.length; i++) {
    prev = (prev * (period - 1) + tr[i]!) / period;
  }
  return prev;
}

/** z-score for 마지막 값 vs 이전 N개. */
export function zScore(values: readonly number[], window: number): number | undefined {
  if (values.length < window + 1) return undefined;
  const sample = values.slice(-window - 1, -1); // 마지막 직전까지 window 개
  const mean = sample.reduce((a, b) => a + b, 0) / window;
  const variance = sample.reduce((a, b) => a + (b - mean) ** 2, 0) / window;
  const std = Math.sqrt(variance);
  const last = values[values.length - 1]!;
  if (std === 0) {
    if (last === mean) return 0;
    return last > mean ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return (last - mean) / std;
}
