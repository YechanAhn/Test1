# ALRGO — Solo Cloud-Native Futures Trading Bot

> "ALRGO Runtime Platform Architecture" 베스트 프랙티스 다이어그램을 **혼자 쓰는 봇** 으로 1:1 매핑한 구현.
> 마스터 골은 [`GOAL.md`](./GOAL.md), 다이어그램 → 코드 매핑은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
> 비상 대응은 [`docs/RUNBOOK.md`](./docs/RUNBOOK.md), 전략 사양은 [`docs/STRATEGY.md`](./docs/STRATEGY.md),
> 라이브 진입 게이트는 [`docs/GATES.md`](./docs/GATES.md).

## 레이아웃
- `apps/web` — User Dashboard + War Room (Next.js + 클라이언트 비즈니스 로직)
- `apps/orchestrator` — Global Scheduler & Coordinator (Routing/Health/Failover)
- `apps/shard` — Runtime Process: V7 Engine + Runtime Adapter
- `apps/functions` — Firebase Cloud Functions (commands/jobs/notifications)
- `packages/core-types` — Domain types + TOPICS 레지스트리
- `packages/safety` — KillSwitch + Heartbeat + Watcher + SnapshotTicker
- `packages/stores` — Command/State/Snapshot/Logs (Memory + Firestore impl)
- `packages/exchange` — IExchange + Binance/Bybit/Mock 어댑터 (직접 작성, no ccxt)
- `packages/event-bus` — Typed topic registry + InMemoryEventBus + HeartbeatBus
- `packages/v7-engine` — Indicators + Strategy + Order Logic + Risk Logic
- `packages/runtime-adapter` — StateManager + RiskGuard + Executor

## 마일스톤 진척
| M | 목표 | 상태 | 테스트 |
|---|---|---|---|
| M0 | Bootstrap | ✅ | safety: 4 |
| M1 | Stores | ✅ | stores: 24 (memory + firestore 동일 계약) |
| M2 | Exchange Layer | ✅ | exchange: 26 (HMAC/RateLimit/Symbol/Binance/Bybit/Mock) |
| M3 | Event Bus | ✅ | event-bus: 10 (10k msg/s + heartbeat) |
| M4 | V7 Engine + Adapter | ✅ | v7-engine: 34, runtime-adapter: 12 |
| M5 | Orchestrator | ✅ | orchestrator: 11 (consistent hash + failover) |
| M6 | Safety Rail | ✅ | safety: 14 (KillSwitch/Heartbeat/Watcher/SnapshotTicker) |
| M7 | Web Client Logic | ✅ | web: 8 (commands + dashboard-model) |
| M8 | Functions | ✅ | functions: 14 (validate + router + gc) |
| **합계** | | | **153 테스트 통과** |
| M9 | Testnet Gate | ⏳ | docs/GATES.md — 실 testnet 키 필요 |
| M10 | Small Live Gate | ⏳ | 동상 — 라이브 키, $50 한도 |
| M11 | Full Run | ⏳ | M10 회고 통과 후 |

## 빠른 시작
```bash
pnpm install
pnpm test          # 153 테스트 실행
pnpm typecheck
pnpm build
```

각 패키지별 테스트:
```bash
cd packages/<name> && npx vitest run
```

## 안전 원칙
1. Risk Guard 우회/비활성 옵션 금지.
2. 출금 권한 API 키 금지.
3. CCXT 등 매직 라이브러리 의존 금지(직접 어댑터 작성).
4. 모든 명령/상태/이벤트는 Firestore + Storage 에 흔적이 남는다.
5. testnet → 소액 라이브 → 본격 운용 3단 게이트 준수(`docs/GATES.md`).
