// Orchestrator entrypoint — Global Scheduler & Coordinator
// 책임: Routing / Load Balance / Health Check / Scaling
// 구현은 M5 마일스톤에서 채운다. 본 파일은 부팅 골격.

import { TOPICS } from "@alrgo/core-types";

async function main() {
  // TODO(M3): event bus connect
  // TODO(M5): routing/balance/health/scaling 모듈 부팅
  console.log(`[orchestrator] booting. topics root=${Object.keys(TOPICS).join(",")}`);
}

main().catch((err) => {
  console.error("[orchestrator] fatal", err);
  process.exit(1);
});
