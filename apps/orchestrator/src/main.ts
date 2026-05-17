import { InMemoryEventBus } from "@alrgo/event-bus";
import { MemorySnapshotStore } from "@alrgo/stores";
import { Orchestrator } from "./Orchestrator.js";

async function main() {
  // 로컬 부트 데모. M8 에서 Cloud Functions/Firestore 연결로 교체.
  const bus = new InMemoryEventBus();
  const snapshots = new MemorySnapshotStore();
  const orch = new Orchestrator(bus, snapshots, {
    ownerUid: process.env.ALLOWED_UID ?? "local-uid",
    shardIds: ["shard-1", "shard-2"],
    standbyShardIds: ["shard-standby"],
    heartbeatDeadlineMs: 2000,
    killDeadlineMs: 10_000,
    evaluateIntervalMs: 1000,
  });
  orch.start();
  console.log("[orchestrator] started", orch.router.activeShards());
}

main().catch((err) => {
  console.error("[orchestrator] fatal", err);
  process.exit(1);
});
