import type { Snapshot } from "@alrgo/core-types";
import type { SnapshotStore } from "@alrgo/stores";

export interface GcPolicy {
  /** ts(ms)가 now 이전 daysToKeep 일 이상이면 삭제 후보 */
  daysToKeep: number;
  /** 1회 실행에서 최대 검사할 스냅샷 수 */
  maxScan: number;
}

export interface GcResult {
  scanned: number;
  candidates: number;
  /** 정책 상 삭제 대상이 된 ID 목록(실제 삭제는 외부 책임 — 보존 무결성을 위해 분리) */
  deleteIds: string[];
}

/**
 * Snapshot GC 정책 평가만 수행한다. 실제 삭제 호출은 caller 결정.
 * 가장 최근 1건은 무조건 보존(복원 가능 보장).
 */
export async function evaluateSnapshotGc(
  store: SnapshotStore,
  ownerUid: string,
  policy: GcPolicy,
  now: number,
): Promise<GcResult> {
  const list = await store.list({ ownerUid, limit: policy.maxScan });
  const cutoff = now - policy.daysToKeep * 24 * 60 * 60 * 1000;
  const candidates = list.filter((s) => s.ts < cutoff);
  // 가장 최신은 보존 (list 는 ts desc)
  const sortedByTs: Snapshot[] = [...list].sort((a, b) => b.ts - a.ts);
  const latest = sortedByTs[0]?.id;
  const deleteIds = candidates.filter((s) => s.id !== latest).map((s) => s.id);
  return { scanned: list.length, candidates: candidates.length, deleteIds };
}
