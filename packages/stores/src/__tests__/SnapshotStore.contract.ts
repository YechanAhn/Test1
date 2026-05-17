import { describe, it, expect } from "vitest";
import type { Snapshot } from "@alrgo/core-types";
import type { SnapshotStore } from "../SnapshotStore.js";

function mk(id: string, ownerUid: string, ts: number): Snapshot {
  return {
    id,
    ownerUid,
    ts,
    shardStates: [],
    cause: "PERIODIC",
  };
}

export function snapshotStoreContract(name: string, factory: () => SnapshotStore): void {
  describe(`SnapshotStore contract — ${name}`, () => {
    it("put/get 라운드트립", async () => {
      const s = factory();
      const sn = mk("s1", "u1", 1000);
      await s.put(sn);
      expect(await s.get("s1")).toEqual(sn);
    });

    it("list: ts 내림차순 + limit/before/after 필터", async () => {
      const s = factory();
      await s.put(mk("a", "u1", 100));
      await s.put(mk("b", "u1", 200));
      await s.put(mk("c", "u1", 300));
      await s.put(mk("d", "u2", 999));
      expect((await s.list({ ownerUid: "u1" })).map((x) => x.id)).toEqual(["c", "b", "a"]);
      expect((await s.list({ ownerUid: "u1", beforeTs: 250 })).map((x) => x.id)).toEqual(["b", "a"]);
      expect((await s.list({ ownerUid: "u1", afterTs: 150 })).map((x) => x.id)).toEqual(["c", "b"]);
      expect((await s.list({ ownerUid: "u1", limit: 1 })).map((x) => x.id)).toEqual(["c"]);
    });

    it("latest: 가장 최근 ts 반환", async () => {
      const s = factory();
      await s.put(mk("a", "u1", 100));
      await s.put(mk("b", "u1", 300));
      await s.put(mk("c", "u1", 200));
      expect((await s.latest("u1"))?.id).toBe("b");
    });
  });
}
