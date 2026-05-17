# STRATEGY — V7 Engine 사양

> 코어 전략은 단순한 모멘텀 + ATR 스탑으로 출발한다. 복잡도는 라이브 검증 후 단계적으로 올린다.

## 1. 진입
- 1m/5m/15m 멀티 타임프레임 EMA(20/50) 정렬.
- RSI(14) 과매도/과매수 컨펌.
- 거래량 z-score > 1.5 일 때만 신호 채택.

## 2. 청산
- ATR(14) 기반 동적 스탑(2.0x ATR).
- 1R 도달 시 50% 부분익절 + 잔여분 트레일링(1.5x ATR).
- 시간 제한: 진입 후 8시간 무변동 시 강제 정리.

## 3. 사이징
- 1 트레이드 리스크 = 계좌의 0.5%.
- 동시 보유 포지션 ≤ 3.
- 명목가 노출 합계 ≤ `MAX_NOTIONAL_USD`.

## 4. 거부 조건 (Risk Guard 통과 못함)
- 최근 24h 5회 이상 손절.
- 변동성(ATR/Price) > 3% 이상 급등 직후.
- 거래소 latency p95 > 500ms.

## 5. 백테스트 정의
- 데이터: 거래소 raw klines 60일 + tick 7일 샘플.
- 메트릭: Sharpe, Sortino, MaxDD, WinRate, ProfitFactor, Avg Holding.
- 합격선: Sharpe ≥ 1.5, MaxDD ≤ 8%, ProfitFactor ≥ 1.4.
