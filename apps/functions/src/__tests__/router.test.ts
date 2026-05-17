import { describe, it, expect, vi } from "vitest";
import { buildDailyReport, fromRiskBreach, routeNotification } from "../notifications/router.js";

describe("routeNotification", () => {
  it("severity=error 는 모든 채널에 전송", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await routeNotification(
      { type: "kill", severity: "error", message: "KILL", ts: 0 },
      { send, channels: ["telegram", "discord", "console"] },
    );
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("severity=warn 은 telegram 우선 1채널", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await routeNotification(
      { type: "risk", severity: "warn", message: "DD high", ts: 0 },
      { send, channels: ["telegram", "discord", "console"] },
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBe("telegram");
  });

  it("severity=info 는 console 만", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await routeNotification(
      { type: "daily_report", severity: "info", message: "ok", ts: 0 },
      { send, channels: ["telegram", "console"] },
    );
    expect(send.mock.calls.map((c) => c[0])).toEqual(["console"]);
  });
});

describe("fromRiskBreach", () => {
  it("KILL_SWITCH_DRAWDOWN → error severity", () => {
    const ev = fromRiskBreach({ code: "KILL_SWITCH_DRAWDOWN", message: "x" }, 100);
    expect(ev.severity).toBe("error");
  });
  it("그 외는 warn", () => {
    const ev = fromRiskBreach({ code: "MAX_NOTIONAL", message: "x" }, 100);
    expect(ev.severity).toBe("warn");
  });
});

describe("buildDailyReport", () => {
  it("샤드 합산 + 24h 내 스냅샷만 카운트", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 10 * day;
    const ev = buildDailyReport(
      [
        {
          shardId: "s1",
          ownerUid: "u1",
          status: "RUNNING",
          heartbeatAt: now,
          positions: [],
          openOrders: [],
          pnlSession: 5,
          drawdownPct: 2,
        },
        {
          shardId: "s2",
          ownerUid: "u1",
          status: "RUNNING",
          heartbeatAt: now,
          positions: [],
          openOrders: [],
          pnlSession: -3,
          drawdownPct: 6,
        },
      ],
      [
        { id: "s-old", ownerUid: "u1", ts: now - 2 * day, shardStates: [], cause: "PERIODIC" },
        { id: "s-new", ownerUid: "u1", ts: now - 1000, shardStates: [], cause: "PERIODIC" },
      ],
      now,
    );
    expect(ev.severity).toBe("info");
    expect(ev.message).toContain("snapshots=1"); // 24h 내 1건만
    expect(ev.message).toContain("pnl=2.00");
    expect(ev.message).toContain("worstDD=6.00%");
  });
});
