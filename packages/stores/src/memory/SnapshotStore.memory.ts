import type { Snapshot } from "@alrgo/core-types";
import type { SnapshotQuery, SnapshotStore } from "../SnapshotStore.js";

export class MemorySnapshotStore implements SnapshotStore {
  private byId = new Map<string, Snapshot>();

  async put(snap: Snapshot): Promise<void> {
    this.byId.set(snap.id, snap);
  }

  async get(id: string): Promise<Snapshot | null> {
    return this.byId.get(id) ?? null;
  }

  async list(q: SnapshotQuery): Promise<Snapshot[]> {
    const all = [...this.byId.values()]
      .filter((s) => s.ownerUid === q.ownerUid)
      .filter((s) => (q.beforeTs ? s.ts < q.beforeTs : true))
      .filter((s) => (q.afterTs ? s.ts > q.afterTs : true))
      .sort((a, b) => b.ts - a.ts);
    return q.limit ? all.slice(0, q.limit) : all;
  }

  async latest(ownerUid: string): Promise<Snapshot | null> {
    const list = await this.list({ ownerUid, limit: 1 });
    return list[0] ?? null;
  }
}
