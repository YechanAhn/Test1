import type { Command, CommandKind } from "@alrgo/core-types";

/**
 * 클라이언트 사이드 Command 빌더.
 * 멱등키는 `kind:ownerUid:bucketMinute` 형태로 1분 내 중복 클릭을 방지.
 */

export interface BuildCommandArgs {
  ownerUid: string;
  kind: CommandKind;
  payload?: Record<string, unknown>;
  now: number; // ms
  /** 멱등키에 추가 차원이 필요할 때(예: target shardId) */
  scope?: string;
}

export function buildCommand(args: BuildCommandArgs): Command {
  const bucket = Math.floor(args.now / 60_000); // 1-minute bucket
  const scope = args.scope ?? "global";
  return {
    id: `cmd_${args.now}_${rand(6)}`,
    ownerUid: args.ownerUid,
    kind: args.kind,
    idempotencyKey: `${args.kind}:${args.ownerUid}:${scope}:${bucket}`,
    payload: args.payload ?? {},
    createdAt: args.now,
  };
}

function rand(n: number): string {
  let s = "";
  const cs = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < n; i++) s += cs[Math.floor(Math.random() * cs.length)];
  return s;
}

/**
 * KILL 명령은 항상 분 단위 멱등성으로 중복 방어 — 사용자가 빨간 버튼을 두 번 눌러도
 * 같은 키로 시스템 전역에서 1회 처리되도록 보장.
 */
export function buildKillCommand(ownerUid: string, now: number, opts: { flattenAll: boolean; cancelAll: boolean }): Command {
  return buildCommand({
    ownerUid,
    kind: "KILL",
    now,
    payload: opts,
    scope: "kill",
  });
}
