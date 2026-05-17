# RUNBOOK — 비상 대응 절차

> Solo Bot 운영자 1인을 위한 절차서. 화면 없이도 폰만으로 수행 가능해야 한다.

## 0. 최우선 — Kill Switch

| 채널 | 트리거 방법 | 결과 |
|---|---|---|
| Web War Room | "EMERGENCY STOP" 빨간 버튼 → 2단계 확인 | `commands.KILL` 발행 |
| Telegram Bot | `/kill` 명령 | Cloud Function 이 `commands.KILL` 발행 |
| Cloud Function 직호출 | `POST /killSwitch` (admin token) | 동일 |

Kill 발행 → Orchestrator → 모든 Shard 가 1초 내 정지. 옵션:
- `FLATTEN_ALL`: 모든 포지션 시장가 청산
- `CANCEL_ALL`: 모든 미체결 오더 취소

## 1. 샤드 헬스 실패
1. War Room에서 적색 샤드 식별.
2. 자동 페일오버가 60초 내 발생했는지 확인 (`failover.trigger` 로그).
3. 미발생 시: Orchestrator 강제 재시작 → 그래도 미발생 시 Kill Switch.

## 2. 거래소 API 장애
1. `watcher.alert` 에서 5xx burst / WS 끊김 확인.
2. Rate limit 강제 하향 → 그래도 실패 시 해당 거래소만 PAUSE.
3. 양 거래소 동시 장애 시 즉시 `FLATTEN_ALL` 후 PAUSE.

## 3. 드로다운 임계 도달
- `KILL_SWITCH_DRAWDOWN_PCT` 도달 시 Risk Logic이 자동 KILL. 사후에 회고만 작성.

## 4. 스냅샷 복구
1. Storage 에서 마지막 정상 스냅샷 다운로드.
2. 신규 샤드 부팅 시 `--restore=<snapshot-id>` 로 기동.
3. Orchestrator 가 트래픽을 신규 샤드로 절체.

## 5. 사후 회고
- 모든 KILL / 페일오버 / 임계 초과 이벤트는 24h 내 `docs/incidents/YYYY-MM-DD-*.md` 로 기록.
