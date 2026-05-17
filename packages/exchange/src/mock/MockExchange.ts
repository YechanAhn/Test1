import type { ExchangeId, OrderAck, OrderIntent, Position } from "@alrgo/core-types";
import type { AccountInfo, IExchange, Kline, KlinesQuery } from "../IExchange.js";

/**
 * 페이퍼 트레이딩/시뮬용 MockExchange. 메모리에서 주문/포지션을 모방하며,
 * 시세는 외부에서 push 한다. M9 게이트 이전까지 광범위하게 사용.
 */
export class MockExchange implements IExchange {
  readonly id: ExchangeId;
  private orders = new Map<string, OrderAck>();
  private positions: Position[] = [];
  private balances = new Map<string, number>([["USDT", 1000]]);
  private prices = new Map<string, number>();
  private clock: () => number;

  constructor(opts: { id?: ExchangeId; now?: () => number } = {}) {
    this.id = opts.id ?? "binance-futures";
    this.clock = opts.now ?? Date.now;
  }

  setPrice(symbol: string, price: number): void {
    this.prices.set(symbol, price);
  }

  setBalance(asset: string, amount: number): void {
    this.balances.set(asset, amount);
  }

  normalizeSymbol(unified: string): string {
    return unified;
  }
  parseSymbol(native: string): string {
    return native;
  }

  async createOrder(intent: OrderIntent): Promise<OrderAck> {
    const ack: OrderAck = {
      clientOrderId: intent.clientOrderId,
      exchangeOrderId: `mock-${this.orders.size + 1}`,
      exchange: this.id,
      symbol: intent.symbol,
      acceptedAt: this.clock(),
    };
    this.orders.set(intent.clientOrderId, ack);

    if (intent.type === "market") {
      const price = this.prices.get(intent.symbol) ?? intent.price;
      if (price === undefined) throw new Error(`mock: no price for ${intent.symbol}`);
      const side = intent.side === "buy" ? "long" : "short";
      const existing = this.positions.find((p) => p.symbol === intent.symbol);
      if (existing) {
        // 같은 방향이면 평단 재계산, 반대면 수량 차감/포지션 종료
        if (existing.side === side) {
          const totalQty = existing.quantity + intent.quantity;
          existing.entryPrice = (existing.entryPrice * existing.quantity + price * intent.quantity) / totalQty;
          existing.quantity = totalQty;
        } else {
          const remaining = existing.quantity - intent.quantity;
          if (remaining <= 0) this.positions = this.positions.filter((p) => p !== existing);
          else existing.quantity = remaining;
        }
      } else {
        this.positions.push({
          exchange: this.id,
          symbol: intent.symbol,
          side,
          quantity: intent.quantity,
          entryPrice: price,
          leverage: 1,
          unrealizedPnl: 0,
        });
      }
    }
    return ack;
  }

  async cancelOrder(args: { clientOrderId: string }): Promise<void> {
    this.orders.delete(args.clientOrderId);
  }

  async cancelAll(symbol?: string): Promise<void> {
    if (!symbol) {
      this.orders.clear();
      return;
    }
    for (const [id, o] of this.orders) if (o.symbol === symbol) this.orders.delete(id);
  }

  async getAccount(): Promise<AccountInfo> {
    return {
      exchange: this.id,
      balances: [...this.balances.entries()].map(([asset, free]) => ({ asset, free, locked: 0 })),
      positions: [...this.positions],
    };
  }

  async getPositions(): Promise<Position[]> {
    return [...this.positions];
  }

  async getOpenOrders(symbol?: string): Promise<OrderAck[]> {
    const all = [...this.orders.values()];
    return symbol ? all.filter((o) => o.symbol === symbol) : all;
  }

  async getKlines(_q: KlinesQuery): Promise<Kline[]> {
    return []; // 백테스트 패키지가 자체 데이터를 공급
  }
}
