import type { OrderIntent, Position } from "@alrgo/core-types";
import type { Decision } from "./strategy.js";

/**
 * Decision 을 OrderIntent 로 변환한다.
 * 책임: 멱등 clientOrderId, reduceOnly 플래그, OCO 페어 ID.
 */

export interface OrderSizing {
  /** 진입 시 1 트레이드 리스크 = accountBalance × riskPct (0.005 = 0.5%) */
  accountBalance: number;
  riskPct: number;
}

export interface BuildOrdersDeps {
  symbol: string;
  exchange: "binance-futures" | "bybit-futures";
  /** 마지막 가격(시장가 청산 가정용) */
  lastPrice: number;
  /** 1 트레이드 사이징 */
  sizing: OrderSizing;
  /** clientOrderId prefix (예: shardId 포함) */
  idPrefix: string;
  /** 멱등 카운터(=현재 ts ms 등 단조 증가) */
  idSeq: number;
}

export function buildIntentsForDecision(decision: Decision, position: Position | undefined, deps: BuildOrdersDeps): OrderIntent[] {
  const baseId = `${deps.idPrefix}-${deps.idSeq}`;
  switch (decision.action) {
    case "hold":
      return [];
    case "enter": {
      const stopDist = Math.abs(deps.lastPrice - decision.stopPrice);
      if (stopDist <= 0) return [];
      const riskUsd = deps.sizing.accountBalance * deps.sizing.riskPct;
      const qty = roundDown(riskUsd / stopDist, 6);
      if (qty <= 0) return [];
      const entry: OrderIntent = {
        clientOrderId: `${baseId}-entry`,
        exchange: deps.exchange,
        symbol: deps.symbol,
        side: decision.side === "long" ? "buy" : "sell",
        type: "market",
        quantity: qty,
      };
      // OCO pair: ATR stop + (옵션) take-profit 은 부분익절로 별도 처리
      const stop: OrderIntent = {
        clientOrderId: `${baseId}-stop`,
        exchange: deps.exchange,
        symbol: deps.symbol,
        side: decision.side === "long" ? "sell" : "buy",
        type: "stop_market",
        quantity: qty,
        stopPrice: decision.stopPrice,
        reduceOnly: true,
      };
      return [entry, stop];
    }
    case "exit": {
      if (!position) return [];
      return [
        {
          clientOrderId: `${baseId}-exit`,
          exchange: deps.exchange,
          symbol: deps.symbol,
          side: position.side === "long" ? "sell" : "buy",
          type: "market",
          quantity: position.quantity,
          reduceOnly: true,
        },
      ];
    }
    case "partial_exit": {
      if (!position) return [];
      const qty = roundDown(position.quantity * decision.fraction, 6);
      if (qty <= 0) return [];
      return [
        {
          clientOrderId: `${baseId}-partial`,
          exchange: deps.exchange,
          symbol: deps.symbol,
          side: position.side === "long" ? "sell" : "buy",
          type: "market",
          quantity: qty,
          reduceOnly: true,
        },
      ];
    }
  }
}

function roundDown(x: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(x * factor) / factor;
}
