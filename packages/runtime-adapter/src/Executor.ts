import type { OrderAck, OrderIntent, RiskBreach } from "@alrgo/core-types";
import type { IExchange } from "@alrgo/exchange";
import type { IEventBus } from "@alrgo/event-bus";
import type { RiskGuard } from "./RiskGuard.js";

export interface ExecuteResult {
  ack?: OrderAck;
  breaches: RiskBreach[];
}

/**
 * V7 결정 → Risk Guard → Exchange.createOrder.
 * 책임:
 *  1) Risk Guard 통과 못하면 주문 보내지 않음.
 *  2) trader.order 이벤트 발행(감사용).
 *  3) ExchangeError 는 호출자로 전파 — Watcher 가 별도 구독.
 */
export class Executor {
  constructor(
    private readonly shardId: string,
    private readonly exchange: IExchange,
    private readonly guard: RiskGuard,
    private readonly bus: IEventBus,
    /** 마지막가/레버리지 추정 함수. 시뮬레이션/실제 모두 동일 인터페이스. */
    private readonly estimateNotional: (i: OrderIntent) => { notionalUsd: number; leverage: number },
  ) {}

  async execute(intent: OrderIntent): Promise<ExecuteResult> {
    const { notionalUsd, leverage } = this.estimateNotional(intent);
    const breaches = this.guard.evaluate(intent, notionalUsd, leverage);
    if (breaches.length > 0) {
      for (const b of breaches) {
        await this.bus.publish("watcher.risk", { shardId: this.shardId, breach: b });
      }
      return { breaches };
    }
    await this.bus.publish("trader.order", { shardId: this.shardId, intent });
    const ack = await this.exchange.createOrder(intent);
    return { ack, breaches: [] };
  }
}
