import type { Command, CommandKind } from "@alrgo/core-types";

const ALLOWED_KINDS: CommandKind[] = [
  "START",
  "STOP",
  "PAUSE",
  "RESUME",
  "FLATTEN_ALL",
  "CANCEL_ALL",
  "KILL",
  "STRATEGY_UPDATE",
];

export type ValidationError =
  | { code: "FORBIDDEN_UID" }
  | { code: "UNKNOWN_KIND"; got: string }
  | { code: "MISSING_IDEMPOTENCY_KEY" }
  | { code: "INVALID_PAYLOAD"; reason: string };

export interface ValidateDeps {
  allowedUid: string;
}

/**
 * Cloud Function 입구에서 클라이언트 명령을 검증.
 * 통과 = right shape + 화이트리스트 UID. 거부 = 첫 위반.
 */
export function validateCommand(cmd: Command, deps: ValidateDeps): ValidationError | null {
  if (cmd.ownerUid !== deps.allowedUid) return { code: "FORBIDDEN_UID" };
  if (!ALLOWED_KINDS.includes(cmd.kind)) return { code: "UNKNOWN_KIND", got: cmd.kind };
  if (!cmd.idempotencyKey || cmd.idempotencyKey.length < 4) return { code: "MISSING_IDEMPOTENCY_KEY" };

  if (cmd.kind === "KILL") {
    const p = cmd.payload ?? {};
    if (typeof (p as { flattenAll?: unknown }).flattenAll !== "boolean") {
      return { code: "INVALID_PAYLOAD", reason: "flattenAll must be boolean" };
    }
    if (typeof (p as { cancelAll?: unknown }).cancelAll !== "boolean") {
      return { code: "INVALID_PAYLOAD", reason: "cancelAll must be boolean" };
    }
  }

  if (cmd.kind === "STRATEGY_UPDATE") {
    const p = cmd.payload ?? {};
    if (!p || typeof p !== "object" || Object.keys(p).length === 0) {
      return { code: "INVALID_PAYLOAD", reason: "params required" };
    }
  }

  return null;
}
