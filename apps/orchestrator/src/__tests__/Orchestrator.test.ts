import { describe, it, expect, vi } from "vitest";
import { InMemoryEventBus } from "@alrgo/event-bus";
import { MemorySnapshotStore } from "@alrgo/stores";
import { Orchestrator } from "../Orchestrator.js";

function build() {
  const bus = new InMemoryEventBus();
  const snapshots = new MemorySnapshotStore();
  const orch = new Orchestrator(bus, snapshots, {
    ownerUid: "u1",
    shardIds: ["s1", "s2"],
    standbyShardIds: ["s-standby"],
    heartbeatDeadlineMs: 1000,
    killDeadlineMs: 5000,
    evaluateIntervalMs: 60_000, // 테스트는 수동 evaluate
  });
  return { bus, snapshots, orch };
}

describe("Orchestrator failover", () => {
  it("샤드가 down 으로 잡히면 standby 가 활성화되고 failover.trigger 발행", async () => {
    const { bus, snapshots, orch } = build();
    await snapshots.put({ id: "snap-1", ownerUid: "u1", ts: 1, shardStates: [], cause: "PERIODIC" });

    orch.start();
    // s1 만 heartbeat 한 번 보내고 끊는다. s2 는 한 번도 안 보냄.
    await bus.publish("health.heartbeat", { shardId: "s1", ts: 0 });
    await bus.publish("health.heartbeat", { shardId: "s2", ts: 0 });

    const failoverSpy = vi.fn();
    bus.subscribe("failover.trigger", failoverSpy);

    // 6초 후 평가 → 둘 다 down
    await orch.evaluate(6000);

    // 첫 다운 처리에서 standby 1개 소모, 두 번째 다운은 처리되지 않음(스탠바이 부족)
    expect(failoverSpy).toHaveBeenCalledTimes(1);
    expect(orch.router.activeShards()).toContain("s-standby");
    expect(orch.failover.availableStandby()).toHaveLength(0);
    await orch.stop();
  });

  it("standby 없으면 failover.ok=false, 라우팅 테이블 변경 없음", async () => {
    const bus = new InMemoryEventBus();
    const snapshots = new MemorySnapshotStore();
    const orch = new Orchestrator(bus, snapshots, {
      ownerUid: "u1",
      shardIds: ["s1"],
      standbyShardIds: [],
      heartbeatDeadlineMs: 1000,
      killDeadlineMs: 5000,
      evaluateIntervalMs: 60_000,
    });
    orch.start();
    await bus.publish("health.heartbeat", { shardId: "s1", ts: 0 });
    await orch.evaluate(6000);
    expect(orch.router.activeShards()).toEqual(["s1"]);
    await orch.stop();
  });
});
