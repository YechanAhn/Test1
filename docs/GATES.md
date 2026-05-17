# GATES — Testnet → 소액 라이브 → 본격 운용

> M9–M11 은 **운영 게이트** 다. 코드가 아니라 실 환경에서 검증해 통과해야 다음 단계로 간다.
> 각 게이트의 출구 조건이 100% 충족되지 않으면 다음 단계로 진행하지 않는다.

---

## M9 — Testnet Gate (1주)

### 출구 조건
- [ ] 7일간 무중단 가동(샤드 down 1회 미만, 모두 자동 페일오버로 회복)
- [ ] Kill Switch 수동 트리거 → 1초 내 정지 + `FLATTEN_ALL` 동작 확인
- [ ] Snapshot 60s 주기로 정상 적재(누락 0)
- [ ] 1주 누적 일일 리포트 7건 정상 수신
- [ ] Risk Guard 의 모든 위반 코드(11종) 중 최소 5종 실제 트리거 + 모두 차단 확인
- [ ] 거래소 5xx/429/네트워크 끊김 카오스 주입 → 자동 복구 또는 안전 정지

### 사전 준비
- Binance **testnet** API 키 (Trade 권한만, Withdraw OFF)
- Bybit **testnet** API 키 (동일)
- Firebase 프로젝트 + Storage 버킷
- Railway 프로젝트 + 4 services(orchestrator + shard×2 + standby)
- Telegram bot + chat id

### 실측 메트릭
- Emergency Stop p95 < 1s (체크리스트)
- Snapshot 손실 = 0
- 페일오버 RTO < 60s

---

## M10 — Small Live Gate (2주, 명목가 ≤ $50)

### 출구 조건
- [ ] 14일간 무중단
- [ ] 실제 손익 인쇄(PnL chart, drawdown 곡선)
- [ ] 슬리피지 통계 수집: 평균/p95 둘 다 모니터링
- [ ] Risk Guard 위반 0건(또는 정상 차단 후 회복)
- [ ] M9에서 발견된 모든 이슈가 다음 PR 로 닫힘

### 사전 준비
- **라이브 키** 발급(권한: Read + Trade only, Withdraw 절대 금지)
- 환경변수 `BINANCE_TESTNET=false`, `BYBIT_TESTNET=false`
- `MAX_NOTIONAL_USD=50`, `MAX_LEVERAGE=2`, `MAX_DRAWDOWN_PCT=3`,
  `KILL_SWITCH_DRAWDOWN_PCT=5` (테스트보다 보수적)
- 별도 작은 잔고만 입금 — 메인 자금과 분리

### 회고 항목 (2주차 종료 시)
- 거래소별 슬리피지 차이
- 헬스 알림 빈도 / 거짓 양성
- 전략 시그널 적중률
- Risk Guard 가 한 번이라도 막지 못한 케이스가 있나? (있으면 즉시 코드 보강)

---

## M11 — Full Run Gate

### 출구 조건
- [ ] M10 회고 항목 모두 close
- [ ] 한도 상향 단계적 계획서(`docs/scaling-plan.md`) 작성
- [ ] 매주 회고 루틴 정착 (Mon 09:00 KST)

### 한도 상향 단계 (예시)
| 주 | 명목가 | 레버리지 | 비고 |
|---|---|---|---|
| 1 | $200 | 2 | M10 종료 직후 |
| 2 | $500 | 2 | 1주차 무사 통과 시 |
| 4 | $1,000 | 3 | 2주차 무사 통과 시 |
| 8 | 본인 결정 | ≤ 3 | M10 메트릭 재검토 후 |

### Stop & Reset 조건 (자동)
- 일일 누적 손실 > 잔고의 3% → 다음 날까지 모든 신규 진입 차단
- 주간 누적 손실 > 잔고의 7% → 1주일 PAUSE + 회고
- Kill Switch 가 3회 이상 트리거된 주 → 명목가 즉시 50% 축소

---

## 공통 — 절대 위반 금지

1. 출금 권한 API 키 사용
2. 시크릿 커밋
3. Risk Guard 우회/비활성
4. 페이퍼/테스트넷 검증 없이 코드 변경 → 라이브 머지
5. 단일 프로세스 환원 (샤드/오케스트레이터 분리 유지)
