import { describe, it, expect } from "vitest";
import { MemorySnapshotStore } from "@alrgo/stores";
import { evaluateSnapshotGc } from "../jobs/snapshotGc.js";

describe("evaluateSnapshotGc", () => {
  it("daysToKeep 이전 스냅샷을 삭제 후보로 식별, 최신은 무조건 보존", async () => {
    const store = new MemorySnapshotStore();
    const day = 24 * 60 * 60 * 1000;
    const now = 10 * day;
    await store.put({ id: "old1", ownerUid: "u1", ts: now - 5 * day, shardStates: [], cause: "PERIODIC" });
    await store.put({ id: "old2", ownerUid: "u1", ts: now - 4 * day, shardStates: [], cause: "PERIODIC" });
    await store.put({ id: "recent", ownerUid: "u1", ts: now - 1 * day, shardStates: [], cause: "PERIODIC" });

    const r = await evaluateSnapshotGc(store, "u1", { daysToKeep: 3, maxScan: 100 }, now);
    expect(r.scanned).toBe(3);
    expect(r.candidates).toBe(2);
    expect(r.deleteIds.sort()).toEqual(["old1", "old2"]);
  });

  it("모두 오래되었더라도 가장 최신은 보존", async () => {
    const store = new MemorySnapshotStore();
    const day = 24 * 60 * 60 * 1000;
    const now = 100 * day;
    await store.put({ id: "a", ownerUid: "u1", ts: 1, shardStates: [], cause: "PERIODIC" });
    await store.put({ id: "b", ownerUid: "u1", ts: 2, shardStates: [], cause: "PERIODIC" });

    const r = await evaluateSnapshotGc(store, "u1", { daysToKeep: 1, maxScan: 100 }, now);
    expect(r.deleteIds).toEqual(["a"]); // b 가 최신이므로 보존
  });
});
