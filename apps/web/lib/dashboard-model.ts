import type { ShardState } from "@alrgo/core-types";

/**
 * Runtime ShardState[] → 화면 모델 변환.
 * 본 함수는 React/Next.js 와 분리되어 순수 함수로 테스트한다.
 */

export interface DashboardModel {
  totalPnlSession: number;
  totalNotionalUsd: number;
  worstDrawdownPct: number;
  shards: {
    shardId: string;
    status: ShardState["status"];
    health: "healthy" | "stale" | "down";
    notionalUsd: number;
    pnlSession: number;
    drawdownPct: number;
    positions: number;
    openOrders: number;
    heartbeatAgeMs: number;
  }[];
}

export function buildDashboardModel(
  shards: ShardState[],
  now: number,
  staleAfterMs = 2000,
  downAfterMs = 10_000,
): DashboardModel {
  let totalPnl = 0;
  let totalNotional = 0;
  let worstDD = 0;
  const rows = shards.map((s) => {
    const notional = s.positions.reduce((a, p) => a + p.quantity * p.entryPrice, 0);
    totalNotional += notional;
    totalPnl += s.pnlSession;
    if (s.drawdownPct > worstDD) worstDD = s.drawdownPct;
    const age = now - s.heartbeatAt;
    const health: "healthy" | "stale" | "down" =
      age > downAfterMs ? "down" : age > staleAfterMs ? "stale" : "healthy";
    return {
      shardId: s.shardId,
      status: s.status,
      health,
      notionalUsd: notional,
      pnlSession: s.pnlSession,
      drawdownPct: s.drawdownPct,
      positions: s.positions.length,
      openOrders: s.openOrders.length,
      heartbeatAgeMs: age,
    };
  });
  return {
    totalPnlSession: totalPnl,
    totalNotionalUsd: totalNotional,
    worstDrawdownPct: worstDD,
    shards: rows,
  };
}
