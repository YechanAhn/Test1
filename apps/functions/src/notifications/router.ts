import type { RiskBreach, ShardState, Snapshot } from "@alrgo/core-types";

export type Channel = "telegram" | "discord" | "console";

export interface NotificationDeps {
  send: (channel: Channel, message: string) => Promise<void>;
  channels: Channel[];
}

export interface NotifiableEvent {
  type: "kill" | "failover" | "risk" | "daily_report" | "watcher";
  severity: "info" | "warn" | "error";
  message: string;
  ts: number;
}

/** 이벤트 → 채널 라우팅 정책. severity 기준으로 어떤 채널에 보낼지 결정. */
export function routeNotification(ev: NotifiableEvent, deps: NotificationDeps): Promise<void[]> {
  const channels = pickChannels(ev.severity, deps.channels);
  const text = formatMessage(ev);
  return Promise.all(channels.map((c) => deps.send(c, text)));
}

function pickChannels(severity: NotifiableEvent["severity"], available: Channel[]): Channel[] {
  // info: console only(스팸 방지). warn: 1차 채널. error: 모두.
  if (severity === "error") return available;
  if (severity === "warn") {
    if (available.includes("telegram")) return ["telegram"];
    return available.slice(0, 1);
  }
  return available.includes("console") ? ["console"] : [];
}

function formatMessage(ev: NotifiableEvent): string {
  const t = new Date(ev.ts).toISOString();
  const icon =
    ev.type === "kill" ? "[KILL]" :
    ev.type === "failover" ? "[FAILOVER]" :
    ev.type === "risk" ? "[RISK]" :
    ev.type === "watcher" ? "[WATCHER]" :
    "[REPORT]";
  return `${icon} ${t} ${ev.message}`;
}

/** RiskBreach → 알림 변환 */
export function fromRiskBreach(breach: RiskBreach, ts: number): NotifiableEvent {
  const severity: NotifiableEvent["severity"] = breach.code === "KILL_SWITCH_DRAWDOWN" ? "error" : "warn";
  return { type: "risk", severity, message: `${breach.code}: ${breach.message}`, ts };
}

/** 일일 리포트 — 최신 ShardState 들 + 최근 24h snapshot 요약. */
export function buildDailyReport(shards: ShardState[], snapshots: Snapshot[], now: number): NotifiableEvent {
  const day = 24 * 60 * 60 * 1000;
  const recent = snapshots.filter((s) => s.ts >= now - day);
  const totalPnl = shards.reduce((a, s) => a + s.pnlSession, 0);
  const worstDD = shards.reduce((a, s) => Math.max(a, s.drawdownPct), 0);
  const numShards = shards.length;
  return {
    type: "daily_report",
    severity: "info",
    message: `daily: shards=${numShards} pnl=${totalPnl.toFixed(2)} worstDD=${worstDD.toFixed(2)}% snapshots=${recent.length}`,
    ts: now,
  };
}
