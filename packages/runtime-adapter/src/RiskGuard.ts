import type { OrderIntent, RiskBreach } from "@alrgo/core-types";
import { evaluateRisk, type RiskLimits, type IntentEvaluation } from "@alrgo/v7-engine";
import type { StateManager } from "./StateManager.js";

/**
 * 주문 직전 마지막 게이트. V7 risk-logic + 글로벌 컨텍스트(StateManager) 결합.
 * 어떤 호출자도 이 게이트를 우회할 수 없도록 단일 메서드로 노출한다.
 */
export class RiskGuard {
  private killSwitchActive = false;
  private exchangeLatencyP95Ms = 0;

  constructor(
    private readonly limits: RiskLimits,
    private readonly state: StateManager,
  ) {}

  activateKillSwitch(): void {
    this.killSwitchActive = true;
  }

  /** 운영자 명시 해제만 허용. 자동 해제 금지. */
  deactivateKillSwitch(): void {
    this.killSwitchActive = false;
  }

  reportLatency(p95Ms: number): void {
    this.exchangeLatencyP95Ms = p95Ms;
  }

  /** 통과면 빈 배열. 거부면 위반 목록. 호출자는 빈 배열이 아니면 절대 주문 발행 X. */
  evaluate(intent: OrderIntent, estimatedNotionalUsd: number, estimatedLeverage: number): RiskBreach[] {
    const s = this.state.getState();
    const inputs = this.state.getRiskContextInputs();
    const ev: IntentEvaluation = {
      intent,
      estimatedNotionalUsd,
      estimatedLeverage,
    };
    return evaluateRisk(ev, {
      limits: this.limits,
      positions: s.positions,
      accountBalanceUsd: inputs.accountBalanceUsd,
      peakBalanceUsd: inputs.peakBalanceUsd,
      lossesLast24h: inputs.lossesLast24h,
      exchangeLatencyP95Ms: this.exchangeLatencyP95Ms,
      killSwitchActive: this.killSwitchActive,
    });
  }
}
