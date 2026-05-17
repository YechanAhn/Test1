import { describe, it, expect } from "vitest";
import type { ShardState } from "@alrgo/core-types";
import type { StateStore } from "../StateStore.js";

function mk(shardId: string, ownerUid: string, ts: number): ShardState {
  return {
    shardId,
    ownerUid,
    status: "RUNNING",
    heartbeatAt: ts,
    positions: [],
    openOrders: [],
    pnlSession: 0,
    drawdownPct: 0,
  };
}

export function stateStoreContract(name: string, factory: () => StateStore): void {
  describe(`StateStore contract — ${name}`, () => {
    it("upsert/get 라운드트립", async () => {
      const s = factory();
      const st = mk("shard-1", "u1", 1000);
      await s.upsert(st);
      expect(await s.get("shard-1")).toEqual(st);
    });

    it("upsert 는 동일 shardId 를 덮어쓴다(샤드당 최신 1건)", async () => {
      const s = factory();
      await s.upsert(mk("shard-1", "u1", 1000));
      await s.upsert(mk("shard-1", "u1", 2000));
      const got = await s.get("shard-1");
      expect(got?.heartbeatAt).toBe(2000);
    });

    it("listByOwner: 소유자 샤드만 반환", async () => {
      const s = factory();
      await s.upsert(mk("a", "u1", 1));
      await s.upsert(mk("b", "u1", 2));
      await s.upsert(mk("c", "u2", 3));
      const list = await s.listByOwner("u1");
      expect(list.map((x) => x.shardId).sort()).toEqual(["a", "b"]);
    });
  });
}
