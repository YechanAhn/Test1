import { describe, it, expect } from "vitest";
import { validateCommand } from "../commands/validate.js";

const allowedUid = "u1";

function cmd(over: object = {}) {
  return {
    id: "c1",
    ownerUid: "u1",
    kind: "START" as const,
    idempotencyKey: "k-abcd",
    payload: {},
    createdAt: 0,
    ...over,
  };
}

describe("validateCommand", () => {
  it("정상 명령 → null", () => {
    expect(validateCommand(cmd(), { allowedUid })).toBeNull();
  });

  it("화이트리스트 외 UID → FORBIDDEN_UID", () => {
    expect(validateCommand(cmd({ ownerUid: "attacker" }), { allowedUid })?.code).toBe("FORBIDDEN_UID");
  });

  it("미지의 kind → UNKNOWN_KIND", () => {
    expect(validateCommand(cmd({ kind: "OFFENSE" as never }), { allowedUid })?.code).toBe(
      "UNKNOWN_KIND",
    );
  });

  it("idempotencyKey 누락/짧음 → MISSING_IDEMPOTENCY_KEY", () => {
    expect(validateCommand(cmd({ idempotencyKey: "" }), { allowedUid })?.code).toBe(
      "MISSING_IDEMPOTENCY_KEY",
    );
    expect(validateCommand(cmd({ idempotencyKey: "abc" }), { allowedUid })?.code).toBe(
      "MISSING_IDEMPOTENCY_KEY",
    );
  });

  it("KILL 은 flattenAll/cancelAll 가 boolean 이어야 함", () => {
    expect(
      validateCommand(
        cmd({ kind: "KILL" as const, payload: { flattenAll: true } }),
        { allowedUid },
      )?.code,
    ).toBe("INVALID_PAYLOAD");

    expect(
      validateCommand(
        cmd({ kind: "KILL" as const, payload: { flattenAll: true, cancelAll: true } }),
        { allowedUid },
      ),
    ).toBeNull();
  });

  it("STRATEGY_UPDATE 는 params 비어있을 수 없음", () => {
    expect(
      validateCommand(cmd({ kind: "STRATEGY_UPDATE" as const, payload: {} }), { allowedUid })?.code,
    ).toBe("INVALID_PAYLOAD");
    expect(
      validateCommand(
        cmd({ kind: "STRATEGY_UPDATE" as const, payload: { riskPct: 0.01 } }),
        { allowedUid },
      ),
    ).toBeNull();
  });
});
