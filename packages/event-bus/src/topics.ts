import type { OrderAck, OrderIntent, Position, RiskBreach, ShardState, Snapshot } from "@alrgo/core-types";

/** 토픽별 페이로드 타입 매핑. 발행/구독 시 컴파일타임으로 강제. */
export interface TopicPayloads {
  // trader.*
  "trader.order": { shardId: string; intent: OrderIntent };
  "trader.fill": { shardId: string; ack: OrderAck; fillPrice: number; fillQty: number };
  "trader.position": { shardId: string; positions: Position[] };

  // watcher.*
  "watcher.alert": { shardId?: string; severity: "info" | "warn" | "error"; message: string };
  "watcher.risk": { shardId: string; breach: RiskBreach };

  // dashboard.*
  "dashboard.state": { shardId: string; state: ShardState };
  "dashboard.delta": { shardId: string; delta: Record<string, unknown> };

  // logs.*
  "logs.info": { topic: string; message: string; ts: number; ctx?: Record<string, unknown> };
  "logs.error": { topic: string; message: string; ts: number; error?: unknown };

  // health.* / failover.* / kill.*
  "health.heartbeat": { shardId: string; ts: number };
  "failover.trigger": { fromShardId: string; toShardId: string; reason: string };
  "kill.switch": { reason: string; flattenAll: boolean; cancelAll: boolean };
}

export type Topic = keyof TopicPayloads;

/** 와일드카드(`trader.*`)를 위한 매칭 헬퍼. */
export function topicMatches(pattern: string, topic: string): boolean {
  if (pattern === topic) return true;
  if (!pattern.endsWith(".*")) return false;
  const prefix = pattern.slice(0, -1); // "trader." 포함한 prefix
  return topic.startsWith(prefix);
}
