# ALRGO — Solo Cloud-Native Futures Trading Bot

> "ALRGO Runtime Platform Architecture" 베스트 프랙티스 다이어그램을 **혼자 쓰는 봇** 으로 1:1 매핑한 구현.
> 마스터 골은 [`GOAL.md`](./GOAL.md), 다이어그램 → 코드 매핑은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md),
> 비상 대응은 [`docs/RUNBOOK.md`](./docs/RUNBOOK.md), 전략 사양은 [`docs/STRATEGY.md`](./docs/STRATEGY.md).

## 레이아웃
- `apps/web` — User Dashboard + War Room (Next.js)
- `apps/orchestrator` — Global Scheduler & Coordinator (Railway)
- `apps/shard` — Runtime Process: V7 Engine + Runtime Adapter (Railway)
- `apps/functions` — Firebase Cloud Functions (commands/jobs/notifications)
- `packages/core-types` — Domain types + topic registry
- `packages/safety` — Kill Switch / Heartbeat / Watcher / Snapshot / Fail-over
- (예정) `packages/exchange` — IExchange + Binance/Bybit 자체 어댑터(매직 라이브러리 X)
- (예정) `packages/event-bus`, `packages/v7-engine`, `packages/runtime-adapter`, `packages/stores`, `packages/backtest`
- `infra/firebase`, `infra/railway`, `.github/workflows`

## 현재 상태
- **M0 Bootstrap 진행 중**: 모노레포 골격, 매핑 문서, Firestore 룰, CI, Kill Switch / Heartbeat 1차 구현 + 유닛테스트.
- 다음: M1 (Stores) → M2 (Exchange) → … → M11 (본격 라이브).

## 안전 원칙
1. Risk Guard 우회/비활성 옵션 금지.
2. 출금 권한 API 키 금지.
3. CCXT 등 매직 라이브러리 의존 금지(직접 어댑터 작성).
4. 모든 명령/상태/이벤트는 Firestore + Storage 에 흔적이 남는다.
5. testnet → 소액 라이브 → 본격 운용 3단 게이트 준수.
