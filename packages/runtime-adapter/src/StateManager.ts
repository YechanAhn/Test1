import type { OrderAck, Position, ShardState, Snapshot } from "@alrgo/core-types";

/** in-memory 상태 보관 + Snapshot 직렬화. */
export class StateManager {
  private state: ShardState;
  private peakBalanceUsd: number;
  private accountBalanceUsd: number;
  private lossesLast24h = 0;
  private lossTimestamps: number[] = [];

  constructor(initial: ShardState, accountBalanceUsd: number) {
    this.state = initial;
    this.accountBalanceUsd = accountBalanceUsd;
    this.peakBalanceUsd = accountBalanceUsd;
  }

  getState(): ShardState {
    return structuredClone(this.state);
  }

  setStatus(status: ShardState["status"]): void {
    this.state.status = status;
  }

  observeHeartbeat(ts: number): void {
    this.state.heartbeatAt = ts;
  }

  setPositions(positions: Position[]): void {
    this.state.positions = structuredClone(positions);
  }

  setOpenOrders(orders: OrderAck[]): void {
    this.state.openOrders = structuredClone(orders);
  }

  onBalanceUpdate(balance: number): void {
    this.accountBalanceUsd = balance;
    if (balance > this.peakBalanceUsd) this.peakBalanceUsd = balance;
    this.state.pnlSession = balance - this.peakBalanceUsd;
    this.state.drawdownPct =
      this.peakBalanceUsd > 0 ? (1 - balance / this.peakBalanceUsd) * 100 : 0;
  }

  /** 24h 손절 카운터. lossTimestamps 는 손절 발생 시점들. */
  recordLoss(nowMs: number): void {
    this.lossTimestamps.push(nowMs);
    const dayAgo = nowMs - 24 * 60 * 60 * 1000;
    this.lossTimestamps = this.lossTimestamps.filter((t) => t >= dayAgo);
    this.lossesLast24h = this.lossTimestamps.length;
  }

  getRiskContextInputs(): {
    accountBalanceUsd: number;
    peakBalanceUsd: number;
    lossesLast24h: number;
  } {
    return {
      accountBalanceUsd: this.accountBalanceUsd,
      peakBalanceUsd: this.peakBalanceUsd,
      lossesLast24h: this.lossesLast24h,
    };
  }

  snapshot(cause: Snapshot["cause"], snapshotId: string, ts: number): Snapshot {
    return {
      id: snapshotId,
      ownerUid: this.state.ownerUid,
      ts,
      shardStates: [this.getState()],
      cause,
    };
  }
}
