import type { OrderIntent, Position, RiskBreach } from "@alrgo/core-types";

export interface RiskLimits {
  maxNotionalUsd: number; // 명목가 합계 한도
  maxLeverage: number;
  maxDrawdownPct: number;
  killDrawdownPct: number;
  maxLossesPerDay: number; // 최근 24h 손절 횟수 한도
  maxLatencyMsP95: number; // 거래소 지연 한도
  minAccountBalance: number; // 미만이면 신규 진입 거부
}

export interface RiskContext {
  limits: RiskLimits;
  positions: Position[];
  accountBalanceUsd: number;
  peakBalanceUsd: number; // 세션/롤링 최대잔고
  lossesLast24h: number;
  exchangeLatencyP95Ms: number;
  killSwitchActive: boolean;
}

export interface IntentEvaluation {
  intent: OrderIntent;
  /** 새 포지션이 추가될 경우의 명목가 (USD). 시장가 가정 시 lastPrice 가 필요. */
  estimatedNotionalUsd: number;
  /** 시장가 진입 후 적용될 레버리지. */
  estimatedLeverage: number;
}

/**
 * 단일 의도 + 현재 컨텍스트에서 리스크 위반을 모두 모아 반환.
 * 빈 배열이면 통과(승인). 1건이라도 있으면 거부.
 */
export function evaluateRisk(ev: IntentEvaluation, ctx: RiskContext): RiskBreach[] {
  const breaches: RiskBreach[] = [];

  if (ctx.killSwitchActive) {
    breaches.push({ code: "KILL_SWITCH_DRAWDOWN", message: "kill switch active" });
    return breaches; // 더 볼 것 없음
  }

  const drawdownPct = ctx.peakBalanceUsd > 0 ? (1 - ctx.accountBalanceUsd / ctx.peakBalanceUsd) * 100 : 0;
  if (drawdownPct >= ctx.limits.killDrawdownPct) {
    breaches.push({
      code: "KILL_SWITCH_DRAWDOWN",
      message: `drawdown ${drawdownPct.toFixed(2)}% >= kill threshold`,
      context: { drawdownPct },
    });
  } else if (drawdownPct >= ctx.limits.maxDrawdownPct) {
    breaches.push({
      code: "MAX_DRAWDOWN",
      message: `drawdown ${drawdownPct.toFixed(2)}% >= max`,
      context: { drawdownPct },
    });
  }

  if (ev.estimatedLeverage > ctx.limits.maxLeverage) {
    breaches.push({
      code: "MAX_LEVERAGE",
      message: `leverage ${ev.estimatedLeverage} > ${ctx.limits.maxLeverage}`,
    });
  }

  const currentNotional = ctx.positions.reduce(
    (s, p) => s + p.quantity * p.entryPrice,
    0,
  );
  const addedNotional = ev.intent.reduceOnly ? 0 : ev.estimatedNotionalUsd;
  if (currentNotional + addedNotional > ctx.limits.maxNotionalUsd) {
    breaches.push({
      code: "MAX_NOTIONAL",
      message: `notional ${(currentNotional + addedNotional).toFixed(2)} > ${ctx.limits.maxNotionalUsd}`,
      context: { currentNotional, addedNotional },
    });
  }

  if (ctx.exchangeLatencyP95Ms > ctx.limits.maxLatencyMsP95) {
    breaches.push({
      code: "LATENCY_BUDGET",
      message: `p95 latency ${ctx.exchangeLatencyP95Ms}ms > ${ctx.limits.maxLatencyMsP95}ms`,
    });
  }

  if (!ev.intent.reduceOnly && ctx.lossesLast24h >= ctx.limits.maxLossesPerDay) {
    breaches.push({
      code: "STRATEGY_REJECT",
      message: `losses_24h=${ctx.lossesLast24h} >= ${ctx.limits.maxLossesPerDay}`,
    });
  }

  if (!ev.intent.reduceOnly && ctx.accountBalanceUsd < ctx.limits.minAccountBalance) {
    breaches.push({
      code: "STRATEGY_REJECT",
      message: `balance ${ctx.accountBalanceUsd} < min ${ctx.limits.minAccountBalance}`,
    });
  }

  return breaches;
}

export function approves(ev: IntentEvaluation, ctx: RiskContext): boolean {
  return evaluateRisk(ev, ctx).length === 0;
}
