# ARCHITECTURE — 다이어그램 1:1 매핑

본 문서는 `GOAL.md` 의 매핑 표를 코드 산출물(폴더/패키지/토픽)에 직접 묶어 추적성을 보장한다.
PR 은 본 표의 어느 행을 채우는지 한 줄로 적시한다.

## 1. Browser / Web App Layer
| 다이어그램 | 코드 경로 | 메모 |
|---|---|---|
| User Dashboard | `apps/web/app/(dashboard)/page.tsx` | TradingView Lightweight Charts |
| AlrgoOS War Room | `apps/web/app/(dashboard)/war-room/page.tsx` | latency heatmap, 상태표 |
| HTTPS (commands) | `apps/web/server/trpc` → `apps/functions` | tRPC over fetch |
| WSS (live stream) | `apps/web/lib/ws-client.ts` ↔ `apps/orchestrator/src/wss` | 단방향 push + 양방향 ack |

## 2. Firebase / GCP Control Plane
| 다이어그램 | 코드 경로 | 메모 |
|---|---|---|
| Auth (Firebase Auth) | `apps/web/lib/firebase/auth.ts` | Email+TOTP, 단일 UID |
| Firestore `commands` | `packages/stores/src/firestore/commandsRepo.ts` | append-only, 멱등키 |
| Firestore `states` | `packages/stores/src/firestore/statesRepo.ts` | 최신 1건/샤드 |
| Firestore `snapshots` | `packages/stores/src/firestore/snapshotsRepo.ts` | 시계열 누적 |
| Cloud Functions | `apps/functions/src/{commands,jobs,notifications}.ts` | 검증/스케줄/알림 |
| Cloud Storage | `packages/stores/src/storage/*.ts` | logs/backups/artifacts |

## 3. Railway Runtime Server Layer
| 다이어그램 | 코드 경로 | 메모 |
|---|---|---|
| Orchestrator | `apps/orchestrator/src/{routing,balance,health,scaling}.ts` | 1대 |
| Shard 1..N | `apps/shard/src/main.ts` | 프로세스 격리 |
| ZeroMQ-style Event Bus | `packages/event-bus/src/{nats,redis-streams}.ts` | 토픽 레지스트리 |
| Trader Events | topic `trader.*` | 체결/오더/포지션 |
| Watcher Events | topic `watcher.*` | 이상탐지/리스크 |
| Dashboard Update | topic `dashboard.*` | 델타 푸시 |
| Logs & Alerts | topic `logs.*` | 구조화 로그/알람 |
| Runtime Adapter — Protocol Adapter | `packages/runtime-adapter/src/protocol.ts` | 정규화 |
| Runtime Adapter — State Manager | `packages/runtime-adapter/src/state.ts` | in-mem + snapshot 출력 |
| Runtime Adapter — Risk Guard | `packages/runtime-adapter/src/risk-guard.ts` | 주문 직전 최종 게이트 |
| V7 Engine — Strategy Core | `packages/v7-engine/src/strategy.ts` | 진입/청산 |
| V7 Engine — Order Logic | `packages/v7-engine/src/order.ts` | OCO/Reduce-only/멱등 |
| V7 Engine — Risk Logic | `packages/v7-engine/src/risk.ts` | 노출/레버리지/DD |

## 4. Exchange Abstraction Layer
| 다이어그램 | 코드 경로 | 메모 |
|---|---|---|
| CCXT-style Interface | `packages/exchange/src/IExchange.ts` | 자체 작성 |
| Binance Futures | `packages/exchange/src/binance/*.ts` | REST/HMAC + WS |
| Bybit Futures | `packages/exchange/src/bybit/*.ts` | REST/HMAC + WS |
| Rate Limit / Errors / Symbols | `packages/exchange/src/common/*.ts` | token bucket, taxonomy, normalize |

## 5. Safety / Fail-over Rail
| 다이어그램 | 코드 경로 | 메모 |
|---|---|---|
| Watcher | `packages/safety/src/watcher.ts` | 이상탐지 룰 |
| Heartbeat | `packages/safety/src/heartbeat.ts` | 1s pub, N s 데드라인 |
| Snapshot | `packages/safety/src/snapshot.ts` | 60s + 이벤트 트리거 |
| Fail-over | `packages/safety/src/failover.ts` | Hot Standby 절체 |
| Emergency Stop | `packages/safety/src/kill-switch.ts` | FLATTEN_ALL / CANCEL_ALL |

## 6. Stores
| 다이어그램 | 인터페이스 | 구현 |
|---|---|---|
| Command Store | `packages/stores/src/CommandStore.ts` | Firestore + Storage 아카이브 |
| State Store | `packages/stores/src/StateStore.ts` | Firestore + Redis 캐시 |
| Snapshot Store | `packages/stores/src/SnapshotStore.ts` | Firestore + Storage |
| Logs/Event Store | `packages/stores/src/LogsStore.ts` | Storage(JSONL) + (옵션) BigQuery |

## 7. Flow Legend ↔ 코드 시그널
| 색 | 의미 | 시그널 |
|---|---|---|
| Solid Cyan | Command | `commands` 컬렉션 신규 문서, idempotencyKey 필수 |
| Dashed Cyan | State Return | `states/{shardId}` 갱신 + `dashboard.state` 토픽 |
| Dotted Purple | Event Bus | `trader.*` / `watcher.*` / `dashboard.*` / `logs.*` |
| Dashed Yellow | Safety/Fail-over | `watcher.alert`, `health.heartbeat`, `failover.trigger` |
| Solid Red | Emergency | `kill.switch` 토픽 + `commands.KILL` 최우선 처리 |
