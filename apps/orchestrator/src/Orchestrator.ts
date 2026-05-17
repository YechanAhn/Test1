import type { IEventBus } from "@alrgo/event-bus";
import type { SnapshotStore } from "@alrgo/stores";
import { ConsistentHashRouter, type Router } from "./routing.js";
import { startHealthAggregator, type HealthAggregator } from "./health.js";
import { FailoverCoordinator } from "./failover.js";

export interface OrchestratorConfig {
  ownerUid: string;
  shardIds: string[];
  standbyShardIds: string[];
  heartbeatDeadlineMs: number; // stale 임계
  killDeadlineMs: number; // down 임계
  evaluateIntervalMs: number;
  router?: Router;
}

/**
 * Global Scheduler & Coordinator.
 * 책임: Routing / Health Check 집계 / Scaling 정책 / Failover 트리거.
 */
export class Orchestrator {
  readonly router: Router;
  readonly failover: FailoverCoordinator;
  private health: HealthAggregator | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly bus: IEventBus,
    private readonly snapshotStore: SnapshotStore,
    private readonly cfg: OrchestratorConfig,
  ) {
    this.router = cfg.router ?? new ConsistentHashRouter(64);
    this.router.setActiveShards(cfg.shardIds);
    this.failover = new FailoverCoordinator({
      bus,
      router: this.router,
      snapshotStore,
      ownerUid: cfg.ownerUid,
    });
    this.failover.setStandbyShards(cfg.standbyShardIds);
  }

  start(): void {
    this.health = startHealthAggregator(
      this.bus,
      this.cfg.heartbeatDeadlineMs,
      this.cfg.killDeadlineMs,
    );
    this.health.setExpectedShards(this.cfg.shardIds);
    this.tick = setInterval(() => {
      void this.evaluate();
    }, this.cfg.evaluateIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
    this.health?.stop();
  }

  /** 외부에서 1회 평가하고 페일오버 결정을 내림(테스트에서 직접 호출). */
  async evaluate(now: number = Date.now()): Promise<void> {
    if (!this.health) return;
    const statuses = this.health.evaluate(now);
    for (const [shardId, st] of Object.entries(statuses)) {
      if (st === "down") {
        const r = await this.failover.failover(shardId, "heartbeat_timeout");
        if (r.ok) {
          // 다음 평가에서 새 샤드를 기대하도록 expected 갱신
          const next = [...this.router.activeShards()];
          this.health.setExpectedShards(next);
        }
      }
    }
  }
}
