// Cloud Functions entry — Orchestration Logic / Webhooks-Jobs / Notifications
// 실 deploy 시 firebase-functions 의 onCall/onSchedule 어댑터를 이 비즈니스 로직에 묶는다.

export { validateCommand, type ValidationError } from "./commands/validate.js";
export {
  routeNotification,
  fromRiskBreach,
  buildDailyReport,
  type Channel,
  type NotifiableEvent,
  type NotificationDeps,
} from "./notifications/router.js";
export { evaluateSnapshotGc, type GcPolicy, type GcResult } from "./jobs/snapshotGc.js";
