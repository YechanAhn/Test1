import type { ShardState } from "@alrgo/core-types";
import type { StateStore } from "../StateStore.js";
import type { FirestoreLike } from "./types.js";

const STATES = "states";

export class FirestoreStateStore implements StateStore {
  constructor(private readonly db: FirestoreLike) {}

  async upsert(state: ShardState): Promise<void> {
    await this.db.collection<ShardState>(STATES).doc(state.shardId).set(state);
  }

  async get(shardId: string): Promise<ShardState | null> {
    const snap = await this.db.collection<ShardState>(STATES).doc(shardId).get();
    return snap.exists ? snap.data() ?? null : null;
  }

  async listByOwner(ownerUid: string): Promise<ShardState[]> {
    const snap = await this.db
      .collection<ShardState>(STATES)
      .where("ownerUid", "==", ownerUid)
      .get();
    return snap.docs.map((d) => d.data()).filter((x): x is ShardState => x !== undefined);
  }
}
