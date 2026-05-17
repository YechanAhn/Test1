import { describe, it, expect } from "vitest";
import type { Command } from "@alrgo/core-types";
import type { CommandStore } from "../CommandStore.js";

function mk(id: string, ownerUid: string, idemKey: string, createdAt: number, kind = "START"): Command {
  return {
    id,
    ownerUid,
    kind: kind as Command["kind"],
    idempotencyKey: idemKey,
    payload: {},
    createdAt,
  };
}

export function commandStoreContract(name: string, factory: () => CommandStore): void {
  describe(`CommandStore contract — ${name}`, () => {
    it("창조: 신규 idempotencyKey 는 created=true 로 저장된다", async () => {
      const s = factory();
      const cmd = mk("c1", "u1", "k1", 1000);
      const res = await s.create(cmd);
      expect(res.created).toBe(true);
      expect(res.command).toEqual(cmd);
      expect(await s.get("c1")).toEqual(cmd);
    });

    it("멱등성: 동일 idempotencyKey 는 첫 명령을 반환하고 새로 만들지 않는다", async () => {
      const s = factory();
      const first = mk("c1", "u1", "K", 1000);
      const second = mk("c2", "u1", "K", 2000); // 새 id 지만 같은 idempotencyKey
      const r1 = await s.create(first);
      const r2 = await s.create(second);
      expect(r1.created).toBe(true);
      expect(r2.created).toBe(false);
      expect(r2.command.id).toBe("c1");
      expect(await s.get("c2")).toBeNull();
    });

    it("listByOwner: 소유자별로 createdAt 내림차순 반환", async () => {
      const s = factory();
      await s.create(mk("a", "u1", "ka", 1000));
      await s.create(mk("b", "u1", "kb", 3000));
      await s.create(mk("c", "u1", "kc", 2000));
      await s.create(mk("d", "u2", "kd", 9999));
      const list = await s.listByOwner({ ownerUid: "u1" });
      expect(list.map((c) => c.id)).toEqual(["b", "c", "a"]);
    });

    it("listByOwner: limit/afterCreatedAt 적용", async () => {
      const s = factory();
      await s.create(mk("a", "u1", "ka", 1000));
      await s.create(mk("b", "u1", "kb", 2000));
      await s.create(mk("c", "u1", "kc", 3000));
      const list = await s.listByOwner({ ownerUid: "u1", limit: 2, afterCreatedAt: 1500 });
      expect(list.map((c) => c.id)).toEqual(["c", "b"]);
    });

    it("result: 기록과 조회가 동작한다", async () => {
      const s = factory();
      await s.create(mk("c1", "u1", "k1", 1000));
      await s.recordResult({ commandId: "c1", ok: true, recordedAt: 1100 });
      const r = await s.getResult("c1");
      expect(r?.ok).toBe(true);
      expect(r?.recordedAt).toBe(1100);
    });
  });
}
