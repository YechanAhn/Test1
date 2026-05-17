import type { Snapshot } from "@alrgo/core-types";

export type SnapshotCause = Snapshot["cause"];

export interface SnapshotTickerDeps {
  /** 현재 상태로 Snapshot 을 구성하는 함수. */
  build: (cause: SnapshotCause, ts: number) => Snapshot;
  /** 이중 저장: 기본/보조 양쪽에 비동기 put. */
  primary: { put: (s: Snapshot) => Promise<void> };
  secondary?: { put: (s: Snapshot) => Promise<void> };
  /** 시계 (테스트 주입) */
  now?: () => number;
}

/**
 * Snapshot 주기 + 이벤트 트리거. 60s 주기, 그리고 외부에서 trigger() 로 즉시.
 * 이중 저장은 정합성보다 가용성 우선 — 한 쪽 실패해도 다른 쪽이 살아있으면 진행.
 */
export class SnapshotTicker {
  private periodTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly deps: SnapshotTickerDeps) {}

  start(intervalMs: number): void {
    if (this.periodTimer) return;
    this.periodTimer = setInterval(() => {
      void this.trigger("PERIODIC");
    }, intervalMs);
  }

  stop(): void {
    if (this.periodTimer) clearInterval(this.periodTimer);
    this.periodTimer = null;
  }

  /** 외부 이벤트(주문/체결/리스크/킬/페일오버) 트리거. */
  async trigger(cause: SnapshotCause): Promise<Snapshot> {
    const now = this.deps.now?.() ?? Date.now();
    const snap = this.deps.build(cause, now);
    const writes: Promise<unknown>[] = [];
    writes.push(safe(this.deps.primary.put(snap)));
    if (this.deps.secondary) writes.push(safe(this.deps.secondary.put(snap)));
    await Promise.all(writes);
    return snap;
  }
}

function safe(p: Promise<unknown>): Promise<unknown> {
  return p.catch((err) => {
    // 한 쪽 실패는 다음 주기에 자연 복구. 호출자가 silence 하지 않도록 콘솔에 남김.
    console.error("[snapshot] write failed:", err);
  });
}
