import type { ShardState } from "@alrgo/core-types";
import type { StateStore } from "../StateStore.js";

export class MemoryStateStore implements StateStore {
  private byShard = new Map<string, ShardState>();

  async upsert(state: ShardState): Promise<void> {
    this.byShard.set(state.shardId, state);
  }

  async get(shardId: string): Promise<ShardState | null> {
    return this.byShard.get(shardId) ?? null;
  }

  async listByOwner(ownerUid: string): Promise<ShardState[]> {
    return [...this.byShard.values()].filter((s) => s.ownerUid === ownerUid);
  }
}
