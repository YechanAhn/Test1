import type { IEventBus } from "@alrgo/event-bus";
import type { SnapshotStore } from "@alrgo/stores";
import type { Router } from "./routing.js";

/**
 * Hot Standby 절체. 다운 샤드 → 대기 샤드 1:1 swap.
 * 1) 라우팅 테이블에서 다운 샤드 제거 + standby 활성화
 * 2) standby 에게 마지막 정상 스냅샷 ID 를 알려줘 복원 트리거
 * 3) failover.trigger 이벤트 발행
 */
export interface FailoverDeps {
  bus: IEventBus;
  router: Router;
  snapshotStore: SnapshotStore;
  ownerUid: string;
}

export class FailoverCoordinator {
  private standby: string[] = [];

  constructor(private readonly deps: FailoverDeps) {}

  setStandbyShards(ids: string[]): void {
    this.standby = [...ids];
  }

  /** down 상태인 샤드에 대해 standby 를 활성화한다. 사용 가능한 standby 가 없으면 false. */
  async failover(downShardId: string, reason: string): Promise<{ ok: boolean; replacement?: string; snapshotId?: string }> {
    const replacement = this.standby.shift();
    if (!replacement) return { ok: false };

    const active = this.deps.router.activeShards().filter((s) => s !== downShardId);
    active.push(replacement);
    this.deps.router.setActiveShards(active);

    const latest = await this.deps.snapshotStore.latest(this.deps.ownerUid);
    await this.deps.bus.publish("failover.trigger", {
      fromShardId: downShardId,
      toShardId: replacement,
      reason,
    });

    return { ok: true, replacement, snapshotId: latest?.id };
  }

  availableStandby(): readonly string[] {
    return this.standby;
  }
}
