import type { Position, RiskBreach } from "@alrgo/core-types";

export interface WatcherInput {
  /** REST p95 ms */
  latencyP95Ms: number;
  /** 마지막 N 체결의 평균 슬리피지(bps) */
  slippageBps: number;
  /** 미체결 누적 시간(ms) */
  oldestUnfilledMs: number;
  /** 현재 보유 명목가 (USD) */
  notionalUsd: number;
  /** 보유 포지션 — 한도 계산용 */
  positions: Position[];
}

export interface WatcherThresholds {
  latencyP95Ms: number;
  slippageBps: number;
  oldestUnfilledMs: number;
  notionalUsd: number;
}

export type WatcherAlert =
  | { severity: "warn" | "error"; code: "LATENCY"; message: string; ctx: { p95: number } }
  | { severity: "warn" | "error"; code: "SLIPPAGE"; message: string; ctx: { bps: number } }
  | { severity: "warn" | "error"; code: "UNFILLED"; message: string; ctx: { ageMs: number } }
  | { severity: "warn" | "error"; code: "NOTIONAL"; message: string; ctx: { notional: number } };

export function evaluateWatcher(input: WatcherInput, t: WatcherThresholds): WatcherAlert[] {
  const out: WatcherAlert[] = [];
  if (input.latencyP95Ms > t.latencyP95Ms) {
    out.push({
      severity: "warn",
      code: "LATENCY",
      message: `p95 latency ${input.latencyP95Ms}ms > ${t.latencyP95Ms}ms`,
      ctx: { p95: input.latencyP95Ms },
    });
  }
  if (input.slippageBps > t.slippageBps) {
    out.push({
      severity: "warn",
      code: "SLIPPAGE",
      message: `slippage ${input.slippageBps}bps > ${t.slippageBps}bps`,
      ctx: { bps: input.slippageBps },
    });
  }
  if (input.oldestUnfilledMs > t.oldestUnfilledMs) {
    out.push({
      severity: "error",
      code: "UNFILLED",
      message: `oldest unfilled ${input.oldestUnfilledMs}ms > ${t.oldestUnfilledMs}ms`,
      ctx: { ageMs: input.oldestUnfilledMs },
    });
  }
  if (input.notionalUsd > t.notionalUsd) {
    out.push({
      severity: "error",
      code: "NOTIONAL",
      message: `notional ${input.notionalUsd} > ${t.notionalUsd}`,
      ctx: { notional: input.notionalUsd },
    });
  }
  return out;
}

/** WatcherAlert → RiskBreach 매핑 (Risk Guard 와 호환). */
export function toRiskBreach(a: WatcherAlert): RiskBreach {
  switch (a.code) {
    case "LATENCY":
      return { code: "LATENCY_BUDGET", message: a.message, context: a.ctx };
    case "NOTIONAL":
      return { code: "MAX_NOTIONAL", message: a.message, context: a.ctx };
    case "SLIPPAGE":
    case "UNFILLED":
      return { code: "STRATEGY_REJECT", message: a.message, context: a.ctx };
  }
}
