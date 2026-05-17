import { describe, it, expect } from "vitest";
import { StateManager } from "../StateManager.js";

function initial() {
  return {
    shardId: "s1",
    ownerUid: "u1",
    status: "BOOTING" as const,
    heartbeatAt: 0,
    positions: [],
    openOrders: [],
    pnlSession: 0,
    drawdownPct: 0,
  };
}

describe("StateManager", () => {
  it("status/heartbeat 갱신", () => {
    const sm = new StateManager(initial(), 1000);
    sm.setStatus("RUNNING");
    sm.observeHeartbeat(100);
    expect(sm.getState().status).toBe("RUNNING");
    expect(sm.getState().heartbeatAt).toBe(100);
  });

  it("peak/drawdown 추적", () => {
    const sm = new StateManager(initial(), 1000);
    sm.onBalanceUpdate(1200);
    sm.onBalanceUpdate(900);
    expect(sm.getState().drawdownPct).toBeCloseTo(25);
  });

  it("24h 손절 카운트가 슬라이딩 윈도로 동작", () => {
    const sm = new StateManager(initial(), 1000);
    const day = 24 * 60 * 60 * 1000;
    sm.recordLoss(0);
    sm.recordLoss(day - 1);
    sm.recordLoss(day + 1); // 슬라이드 → 첫 손절 빠짐
    expect(sm.getRiskContextInputs().lossesLast24h).toBe(2);
  });

  it("snapshot 직렬화", () => {
    const sm = new StateManager(initial(), 1000);
    const snap = sm.snapshot("PERIODIC", "snap-1", 500);
    expect(snap.id).toBe("snap-1");
    expect(snap.ts).toBe(500);
    expect(snap.shardStates).toHaveLength(1);
  });
});
