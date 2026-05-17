import type { Snapshot } from "@alrgo/core-types";
import type { SnapshotQuery, SnapshotStore } from "../SnapshotStore.js";
import type { FirestoreLike } from "./types.js";

const SNAPSHOTS = "snapshots";

export class FirestoreSnapshotStore implements SnapshotStore {
  constructor(private readonly db: FirestoreLike) {}

  async put(snap: Snapshot): Promise<void> {
    await this.db.collection<Snapshot>(SNAPSHOTS).doc(snap.id).set(snap);
  }

  async get(id: string): Promise<Snapshot | null> {
    const snap = await this.db.collection<Snapshot>(SNAPSHOTS).doc(id).get();
    return snap.exists ? snap.data() ?? null : null;
  }

  async list(q: SnapshotQuery): Promise<Snapshot[]> {
    let query = this.db.collection<Snapshot>(SNAPSHOTS).where("ownerUid", "==", q.ownerUid);
    if (q.beforeTs) query = query.where("ts", "<", q.beforeTs);
    if (q.afterTs) query = query.where("ts", ">", q.afterTs);
    query = query.orderBy("ts", "desc");
    if (q.limit) query = query.limit(q.limit);
    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter((x): x is Snapshot => x !== undefined);
  }

  async latest(ownerUid: string): Promise<Snapshot | null> {
    const list = await this.list({ ownerUid, limit: 1 });
    return list[0] ?? null;
  }
}
