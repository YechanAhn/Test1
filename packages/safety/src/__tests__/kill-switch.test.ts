import { describe, it, expect, vi } from "vitest";
import { KillSwitch } from "../kill-switch.js";

describe("KillSwitch", () => {
  it("emits a KILL command and publishes kill topic with both flatten and cancel", async () => {
    const publishKill = vi.fn().mockResolvedValue(undefined);
    const recordCommand = vi.fn().mockResolvedValue(undefined);
    const ks = new KillSwitch({ publishKill, recordCommand, now: () => 1700000000000 });

    await ks.trigger("uid-1", "USER_REQUEST");

    expect(recordCommand).toHaveBeenCalledTimes(1);
    const cmd = recordCommand.mock.calls[0]?.[0];
    expect(cmd.kind).toBe("KILL");
    expect(cmd.ownerUid).toBe("uid-1");
    expect(cmd.idempotencyKey).toContain("USER_REQUEST");
    expect(publishKill).toHaveBeenCalledWith("USER_REQUEST", {
      flattenAll: true,
      cancelAll: true,
    });
  });

  it("respects custom options", async () => {
    const publishKill = vi.fn().mockResolvedValue(undefined);
    const recordCommand = vi.fn().mockResolvedValue(undefined);
    const ks = new KillSwitch({ publishKill, recordCommand });

    await ks.trigger("uid-1", "DRAWDOWN_BREACH", { flattenAll: false, cancelAll: true });

    expect(publishKill).toHaveBeenCalledWith("DRAWDOWN_BREACH", {
      flattenAll: false,
      cancelAll: true,
    });
  });
});
