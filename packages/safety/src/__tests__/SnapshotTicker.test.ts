import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SnapshotTicker } from "../SnapshotTicker.js";
import type { Snapshot } from "@alrgo/core-types";

function build(cause: Snapshot["cause"], ts: number): Snapshot {
  return { id: `s-${ts}`, ownerUid: "u1", ts, shardStates: [], cause };
}

describe("SnapshotTicker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("외부 trigger 시 primary+secondary 양쪽에 put", async () => {
    const primary = { put: vi.fn().mockResolvedValue(undefined) };
    const secondary = { put: vi.fn().mockResolvedValue(undefined) };
    const ticker = new SnapshotTicker({ build, primary, secondary, now: () => 1000 });
    await ticker.trigger("RISK");
    expect(primary.put).toHaveBeenCalledOnce();
    expect(secondary.put).toHaveBeenCalledOnce();
    expect(primary.put.mock.calls[0]?.[0].cause).toBe("RISK");
  });

  it("주기 ticker 가 PERIODIC 으로 트리거", async () => {
    const primary = { put: vi.fn().mockResolvedValue(undefined) };
    const ticker = new SnapshotTicker({ build, primary, now: () => Date.now() });
    ticker.start(60_000);
    await vi.advanceTimersByTimeAsync(180_000); // 3 tick
    expect(primary.put).toHaveBeenCalledTimes(3);
    ticker.stop();
  });

  it("primary 실패해도 secondary 는 계속 시도(가용성 우선)", async () => {
    const primary = { put: vi.fn().mockRejectedValue(new Error("primary down")) };
    const secondary = { put: vi.fn().mockResolvedValue(undefined) };
    const ticker = new SnapshotTicker({ build, primary, secondary, now: () => 0 });
    await ticker.trigger("PERIODIC"); // throw 해서는 안 됨
    expect(secondary.put).toHaveBeenCalledOnce();
  });
});
