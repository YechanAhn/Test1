import { describe, it, expect } from "vitest";
import { buildCommand, buildKillCommand } from "../commands.js";

describe("buildCommand", () => {
  it("기본 멱등키는 kind:owner:scope:minute-bucket", () => {
    const c = buildCommand({ ownerUid: "u1", kind: "START", now: 1700000000000 });
    expect(c.idempotencyKey).toMatch(/^START:u1:global:/);
  });
  it("같은 분 안에 같은 kind 는 동일 멱등키", () => {
    const a = buildCommand({ ownerUid: "u1", kind: "STOP", now: 1700000000000 });
    const b = buildCommand({ ownerUid: "u1", kind: "STOP", now: 1700000001000 });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
  });
  it("kind 가 다르면 멱등키도 다르다", () => {
    const a = buildCommand({ ownerUid: "u1", kind: "PAUSE", now: 1700000000000 });
    const b = buildCommand({ ownerUid: "u1", kind: "RESUME", now: 1700000000000 });
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
  });
});

describe("buildKillCommand", () => {
  it("KILL kind + scope=kill + 옵션 payload", () => {
    const c = buildKillCommand("u1", 1700000000000, { flattenAll: true, cancelAll: true });
    expect(c.kind).toBe("KILL");
    expect(c.idempotencyKey).toContain("KILL:u1:kill:");
    expect(c.payload).toEqual({ flattenAll: true, cancelAll: true });
  });
  it("같은 분 두 번 클릭해도 같은 멱등키", () => {
    const a = buildKillCommand("u1", 1700000000000, { flattenAll: true, cancelAll: true });
    const b = buildKillCommand("u1", 1700000000999, { flattenAll: true, cancelAll: true });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
  });
});
