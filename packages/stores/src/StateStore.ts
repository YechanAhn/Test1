import type { ShardState } from "@alrgo/core-types";

export interface StateStore {
  /** 가장 최신 상태로 덮어쓴다(샤드당 1건). */
  upsert(state: ShardState): Promise<void>;
  get(shardId: string): Promise<ShardState | null>;
  listByOwner(ownerUid: string): Promise<ShardState[]>;
}
