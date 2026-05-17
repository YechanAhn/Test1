import type { Snapshot } from "@alrgo/core-types";

export interface SnapshotQuery {
  ownerUid: string;
  limit?: number;
  beforeTs?: number;
  afterTs?: number;
}

export interface SnapshotStore {
  put(snap: Snapshot): Promise<void>;
  get(id: string): Promise<Snapshot | null>;
  list(q: SnapshotQuery): Promise<Snapshot[]>;
  latest(ownerUid: string): Promise<Snapshot | null>;
}
