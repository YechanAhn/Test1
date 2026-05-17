# GOAL — ALRGO Personal Bot (Solo Cloud-Native Futures Trading System)

> 본 문서는 "ALRGO Runtime Platform Architecture (Cloud-Native Futures Trading System)" 베스트 프랙티스 다이어그램을
> **혼자 사용하는 개인 봇 시스템(Solo Bot)** 형태로 1:1 매핑하여 **계획 → 테스트 → 실제 구현**까지 끝내기 위한
> 마스터 골(Goal) 프롬프트이다. 모든 레이어/플로우/스토어/세이프티 컴포넌트를 하나도 빼놓지 않고 옮긴다.
> "혼자 쓰는 봇" 이라는 점만 제약으로 가져가고(멀티테넌트 X, 유저 관리 최소화), 그 외 아키텍처 원형은 유지한다.

---

## 0. 핵심 원칙 (Non-Negotiables)

1. **원본 아키텍처 1:1 매핑**: 다이어그램의 모든 박스/화살표/플로우 색상은 코드/모듈/메시지 토픽으로 1:1 매핑한다.
2. **Solo 모드**: 사용자는 본인 1명. Firebase Auth는 단일 계정으로 잠그고, 멀티유저 권한 분기/UI 다국화는 하지 않는다.
3. **Cloud-Native**: 로컬 전용 매크로/단일 프로세스 봇으로 절대 환원하지 않는다.
   Control Plane(Firebase/GCP) ↔ Runtime(Railway) ↔ Exchange Layer 의 3분리 구조를 유지한다.
4. **Safety First**: 어떤 기능보다 `Watcher → Heartbeat → Snapshot → Fail-over → Emergency Stop` 레일이 먼저 동작해야 한다.
5. **테스트 우선**: 실거래 코드를 1줄도 작성하기 전에, 페이퍼 트레이딩/시뮬레이션/단위·통합 테스트가 통과해야 한다.
6. **선 페이퍼, 후 라이브**: Binance/Bybit 모두 **testnet → 소액 라이브 → 본격 운용** 의 3단 게이트를 거친다.
7. **모든 명령은 감사 가능**: User → System 명령, System 상태 변화, 스냅샷은 전부 Firestore에 기록되어야 한다.
8. **Concept, Not Magic Library**: CCXT-style 인터페이스는 "개념"으로 차용. 매직 라이브러리 의존 금지. 어댑터 직접 작성.

---

## 1. 매핑 테이블 — 다이어그램의 모든 박스/플로우

### 1.1 BROWSER / WEB APP LAYER
| 다이어그램 요소 | Solo Bot 구현 |
|---|---|
| **User Dashboard** | Next.js 14(App Router) + TradingView Lightweight Charts. 포지션/PnL/주문/차트/지표 표시. |
| **AlrgoOS War Room** | 동일 앱의 `/war-room` 라우트. 시스템 상태표(지연/업타임/이상), 월드맵(거래소 latency heatmap). |
| HTTPS 흐름 | REST: `Web → Cloud Functions` (커맨드 발행, 인증). |
| WSS 흐름 | WebSocket: `Web ↔ Railway Orchestrator` (라이브 상태/이벤트 스트림). |

### 1.2 FIREBASE / GCP CONTROL PLANE
| 다이어그램 요소 | Solo Bot 구현 |
|---|---|
| **Authentication (Firebase Auth)** | Email+Password + 2FA(TOTP). 단 1개의 UID만 화이트리스트. |
| **Firestore: commands** (User → System) | 컬렉션 `commands/{id}`: `START`, `STOP`, `PAUSE`, `FLATTEN_ALL`, `KILL`, `STRATEGY_UPDATE`. 멱등키 포함. |
| **Firestore: states** (Runtime → System) | 컬렉션 `states/{shardId}`: 최신 런타임 스냅샷(포지션/오더/PnL/리스크게이지/하트비트). |
| **Firestore: snapshots** (History/Audit) | 컬렉션 `snapshots/{ts}`: 주기적(예: 60s) + 이벤트 트리거 스냅샷. 시계열 누적. |
| **Cloud Functions** | (a) 명령 검증/오케스트레이션 트리거, (b) 스케줄 잡(스냅샷 GC, 일일 리포트), (c) 알림 라우팅(Telegram/Discord/Email). |
| **Cloud Storage** | 로그(JSONL) / 백업(스냅샷 코어덤프) / 아티팩트(빌드 산출물·전략 패키지). 일/주 단위 로테이션. |

### 1.3 RAILWAY RUNTIME SERVER LAYER
| 다이어그램 요소 | Solo Bot 구현 |
|---|---|
| **Orchestrator (Global Scheduler & Coordinator)** | Railway 서비스 1. 책임: **Routing**(심볼→Shard), **Load Balance**(샤드 분산), **Health Check**(샤드 하트비트 집계), **Scaling**(샤드 수 조정 정책). |
| **Shard 1..N (Runtime Process)** | Railway 서비스 N. 각 샤드는 N개 심볼/전략을 담당. 프로세스 격리. |
| **ZeroMQ-style Event Bus** | NATS 또는 Redis Streams로 ZMQ Pub/Sub 의미를 구현. 토픽: `trader.*`, `watcher.*`, `dashboard.*`, `logs.*`. |
| → Trader Events | 체결/오더/포지션 변화 이벤트. |
| → Watcher Events | 이상 탐지/리스크 임계치 초과. |
| → Dashboard Update | UI로 푸시되는 델타 업데이트. |
| → Logs & Alerts | 구조화된 로그/알람. |
| **Runtime Adapter (per Shard)** | 3개 책임 모듈: **Protocol Adapter**(거래소 프로토콜 정규화), **State Manager**(In-mem 상태 + Snapshot 출력), **Risk Guard**(주문 직전 마지막 게이트). |
| **V7 Engine Authority (per Shard)** | Original V7 Engine(전략 코어) / Order Logic(주문 라우팅·OCO·Reduce-only) / Risk Logic(포지션·노출·드로다운 한도). **Authority = 최종 결정권자**: 어댑터/오케스트레이터도 V7 Engine의 거부권을 우회 불가. |

### 1.4 EXCHANGE ABSTRACTION LAYER
| 다이어그램 요소 | Solo Bot 구현 |
|---|---|
| **CCXT-style Interface** | 자체 작성한 `IExchange` 인터페이스: Unified API / Rate Limit(token bucket) / Error Handling(분류·재시도) / Symbol Normalization(`BTCUSDT⇄BTC/USDT:USDT`). |
| **Binance Futures** | REST/HMAC + WebSocket(User Data Stream + Market Data). |
| **Bybit Futures** | REST/HMAC + WebSocket(Private + Public). |
| **...** | 추가 거래소는 `IExchange` 만 구현하면 플러그인. |
| "Concept, Not Magic Library" | CCXT 라이브러리 의존 금지. 직접 구현. |
| Direct REST / HMAC (Orders/Account) | 주문/계좌는 직접 서명한 REST. |
| REST Response (Ack/Info) | 응답은 `OrderAck` / `AccountInfo` 도메인으로 매핑. |
| WebSocket (Market Data) | 시세는 WS 우선. 폴백 REST. |
| WebSocket (Updates) | 체결/포지션 업데이트는 WS Private. |

### 1.5 SAFETY / FAIL-OVER RAIL (가장 먼저 구현)
| 다이어그램 요소 | Solo Bot 구현 |
|---|---|
| **Watcher** | 시스템 모니터 + 이상 탐지(지연 폭증, 슬리피지 폭증, 미체결 누적, 노출 한도 초과). |
| **Heartbeat** | 샤드/오케스트레이터/어댑터가 1초 주기로 heartbeat 토픽 송신. N초 무응답 시 비정상 판정. |
| **Snapshot** | 상태 스냅샷 60s 주기 + 이벤트(주문/체결/리스크 임계) 트리거. Firestore + Cloud Storage 이중 저장. |
| **Fail-over** | Hot Standby 샤드 1개 상시 대기. 헬스체크 실패 시 오케스트레이터가 트래픽 절체. 스냅샷에서 상태 복원. |
| **Emergency Stop (Kill Switch)** | 모든 활동 중단 + 옵션: `FLATTEN_ALL`(시장가 청산) / `CANCEL_ALL`(오더 취소). 웹/Telegram/Cloud Function 어디서든 호출 가능. |

### 1.6 STORES (오른쪽 하단)
| 다이어그램 요소 | Solo Bot 구현 |
|---|---|
| **Command Store** | Firestore `commands` + Storage(JSONL 아카이브). |
| **State Store** | Firestore `states` (최신 1건/샤드) + Redis(실시간 캐시). |
| **Snapshot Store** | Firestore `snapshots` + Storage(코어덤프). |
| **Logs / Event Store** | Storage(JSONL daily) + BigQuery export(옵션). |

### 1.7 FLOW LEGEND (화살표 색)
| 색상 | 의미 | 구현 |
|---|---|---|
| Solid Cyan | **Command Flow** (Request/Control) | Web → CF → Orchestrator → Shard |
| Dashed Cyan | **State Return Flow** (Status/Snapshot) | Shard → Orchestrator → CF/Firestore → Web |
| Dotted Purple | **Event Bus Flow** (Pub/Sub) | NATS/Redis Streams topics |
| Dashed Yellow | **Safety/Fail-over Flow** | Watcher/Heartbeat → Orchestrator → Fail-over |
| Solid Red | **Emergency Flow** | Kill Switch → 모든 Shard 즉시 정지 |

---

## 2. 기술 스택 결정 (Solo 최적화)

- **Language**: TypeScript(전체) + Python(전략 백테스트 한정).
- **Runtime**: Node.js 20 LTS, pnpm 모노레포(`apps/*`, `packages/*`).
- **Web**: Next.js 14 + Tailwind + shadcn/ui + TradingView Lightweight Charts.
- **Backend**: Fastify(Orchestrator/Shard) + tRPC(웹↔CF) + ws(WSS).
- **Control Plane**: Firebase(Auth, Firestore, Cloud Functions, Storage). Solo 한정이라 GCP 추가 비용 최소화.
- **Runtime Host**: Railway(Orchestrator 1 + Shard 2~N + Hot Standby 1).
- **Event Bus**: NATS(JetStream) 1차 후보, Redis Streams 2차.
- **Cache/Lock**: Redis(Upstash) — Rate limit/락/하트비트 카운터.
- **Test**: Vitest(유닛), Playwright(E2E 웹), Pact(어댑터 계약 테스트), 자체 Backtest Harness.
- **Observability**: Pino 로그 → Cloud Storage, OpenTelemetry → (옵션) Grafana Cloud.
- **Secrets**: Railway Variables + Doppler(옵션). 키는 Read+Trade only, 출금 권한 절대 금지.

---

## 3. 모노레포 구조

```
/
├── apps/
│   ├── web/                  # User Dashboard + War Room (Next.js)
│   ├── orchestrator/         # Global Scheduler & Coordinator
│   ├── shard/                # Runtime Process (V7 Engine + Adapter)
│   └── functions/            # Firebase Cloud Functions
├── packages/
│   ├── core-types/           # Domain types: Order, Position, Command, State, Snapshot
│   ├── exchange/             # IExchange + Binance/Bybit adapters (CCXT-style, no ccxt)
│   ├── event-bus/            # NATS/Redis Streams wrapper, topic registry
│   ├── v7-engine/            # Strategy core, Order Logic, Risk Logic
│   ├── runtime-adapter/      # Protocol Adapter, State Manager, Risk Guard
│   ├── safety/               # Watcher, Heartbeat, Snapshot, Fail-over, Kill-Switch
│   ├── stores/               # Command/State/Snapshot/Logs store interfaces + Firestore impls
│   └── backtest/             # Backtest harness, replay, paper trading
├── infra/
│   ├── railway/              # railway.json, services config
│   ├── firebase/             # firestore.rules, indexes, functions deploy
│   └── github/               # GH Actions: lint/test/deploy
├── docs/
│   ├── ARCHITECTURE.md       # 다이어그램 1:1 매핑 본문
│   ├── RUNBOOK.md            # 비상 대응(킬 스위치, 페일오버 절차)
│   └── STRATEGY.md           # V7 전략 사양
└── GOAL.md                   # 본 문서
```

---

## 4. 마일스톤 (Plan → Test → Implement)

### M0. 부트스트랩 (1일)
- 모노레포 초기화(pnpm/turbo), ESLint/Prettier/TS strict.
- Firebase 프로젝트 + Railway 프로젝트 생성, 시크릿 주입 파이프라인.
- `docs/ARCHITECTURE.md` 에 다이어그램 1:1 매핑 표 옮겨 적기.

### M1. Core Types & Stores (1~2일)
- `packages/core-types`: `Command`, `State`, `Snapshot`, `OrderIntent`, `OrderAck`, `Position`, `RiskBreach`.
- `packages/stores`: Firestore impl + 인메모리 impl(테스트용).
- `firestore.rules`: 단일 UID 화이트리스트.
- **테스트**: 스토어 계약 테스트 통과.

### M2. Exchange Abstraction Layer (3~5일)
- `IExchange` 인터페이스 정의(주문/취소/조회/계좌/시세).
- Binance Futures testnet 어댑터 + Bybit Futures testnet 어댑터.
- Rate limit(token bucket), error taxonomy, symbol normalization.
- **테스트**: testnet 라이브 통합 테스트 + Pact 계약 테스트.

### M3. Event Bus + Heartbeat (2일)
- `packages/event-bus`: 토픽 레지스트리(`trader.*`, `watcher.*`, `dashboard.*`, `logs.*`).
- Heartbeat 송수신, 데드라인 감지.
- **테스트**: 1만 msg/s 통과, 강제 종료 시 데드라인 감지.

### M4. V7 Engine + Runtime Adapter (5~7일)
- V7 Engine: 진입/청산/지표(우선 단순 모멘텀/MA + ATR 스탑) → 향후 확장.
- Order Logic: OCO, Reduce-only, Post-only, idempotency key.
- Risk Logic: max notional / max leverage / max drawdown / kill-switch threshold.
- Runtime Adapter: Protocol Adapter(거래소 응답 ↔ 도메인), State Manager, **Risk Guard(주문 직전 최종 거부권)**.
- **테스트**: 백테스트 + 페이퍼 트레이딩 + Risk Guard 강제 거부 시나리오.

### M5. Orchestrator + Sharding (3일)
- Routing(심볼 해시 → 샤드), Load Balance, Health Check 집계, Scaling 정책.
- Hot Standby 1대 상시 가동, 스냅샷 기반 즉시 복구.
- **테스트**: 샤드 강제 죽이고 60초 내 복구 + 포지션 보존.

### M6. Safety/Fail-over Rail (3일)
- Watcher: 이상 탐지 룰(레이턴시·슬리피지·노출·미체결).
- Snapshot: 60s + 이벤트 트리거, 이중 저장.
- Fail-over: 자동 절체.
- **Emergency Stop**: Web/Telegram/CF 3-channel 트리거. `FLATTEN_ALL` / `CANCEL_ALL`.
- **테스트**: 카오스 테스트(네트워크 단절, API 5xx, 시계 어긋남).

### M7. Web Dashboard + War Room (4~6일)
- User Dashboard: 차트/포지션/오더/PnL/지표.
- War Room: 시스템 상태표, latency heatmap, 로그 tail.
- 명령 발행 UI(START/STOP/PAUSE/FLATTEN/KILL).
- **테스트**: Playwright E2E.

### M8. Cloud Functions + 알림 (2일)
- 명령 검증·발행, 스냅샷 GC, 일일 리포트.
- Telegram/Discord 알림 라우팅.

### M9. 게이트 1 — Testnet 운용 (1주)
- 1주 testnet 무중단 운용. 일일 리포트/이상 0건 목표.

### M10. 게이트 2 — 소액 라이브 (2주)
- 라이브 키, 노출 한도 매우 낮게(예: 명목 $50). 모든 안전장치 라이브 검증.

### M11. 게이트 3 — 본격 운용
- 한도 단계적 상향. 매주 회고 + 전략 튜닝.

---

## 5. Definition of Done (각 마일스톤 공통)

- [ ] 다이어그램의 해당 박스/화살표를 코드/모듈/토픽으로 매핑한 항목이 `ARCHITECTURE.md`에 표기됨.
- [ ] 단위 테스트 + 통합 테스트 추가.
- [ ] Kill-Switch 시나리오에서 즉시 정지/청산 동작.
- [ ] 로그/스냅샷이 Firestore + Storage에 흔적을 남김.
- [ ] RUNBOOK.md에 장애 대응 절차 업데이트.

---

## 6. 금지 사항 (Solo Bot이라도 절대 하지 말 것)

1. 출금(Withdraw) 권한 API 키 사용.
2. 시크릿을 리포에 커밋(.env, json key 등) — 사전 차단 훅 필수.
3. CCXT 등 외부 거래소 매직 라이브러리 의존(원형이 "Concept, Not Magic Library").
4. Risk Guard 우회/끄기 옵션.
5. Snapshot 없이 라이브 트레이드.
6. `--no-verify`, `force push to main`, 테스트 스킵 머지.
7. 단일 프로세스로 환원(샤드/오케스트레이터 분리 유지).

---

## 7. 첫 실행 명령 (다음 세션이 할 일)

1. M0 부트스트랩 시작: `pnpm init`, turbo 세팅, `apps/*`, `packages/*` 스캐폴딩.
2. `docs/ARCHITECTURE.md` 작성(§1 매핑 표 + 다이어그램 캡션).
3. `firestore.rules` 단일 UID 화이트리스트 + `commands/states/snapshots` 컬렉션 스키마.
4. `packages/core-types` 부터 구현, 그 다음 `packages/safety`(킬스위치 먼저).
5. 모든 PR은 "다이어그램의 어느 박스/화살표를 채우는가" 한 줄 표기 필수.

---

## 8. 성공 지표

- **안전성**: Emergency Stop p95 < 1s. Snapshot 손실 0. 페일오버 RTO < 60s.
- **신뢰성**: 30일 라이브 무중단. 미체결 누적 = 0.
- **재현성**: 임의의 스냅샷에서 상태 100% 복원.
- **관측성**: 모든 명령/상태/이벤트가 Firestore+Storage에 흔적이 있다.
- **개인 사용성**: 폰에서 War Room 열고 5초 안에 시스템 상태 파악 + Kill 1탭.
