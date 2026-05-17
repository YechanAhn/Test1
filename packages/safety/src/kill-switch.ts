import type { Command } from "@alrgo/core-types";

export type KillReason =
  | "USER_REQUEST"
  | "DRAWDOWN_BREACH"
  | "WATCHER_ANOMALY"
  | "EXCHANGE_OUTAGE"
  | "FAILOVER_TIMEOUT";

export interface KillOptions {
  flattenAll: boolean;
  cancelAll: boolean;
}

export interface KillSwitchDeps {
  publishKill: (reason: KillReason, opts: KillOptions) => Promise<void>;
  recordCommand: (cmd: Command) => Promise<void>;
  now?: () => number;
}

export class KillSwitch {
  constructor(private readonly deps: KillSwitchDeps) {}

  async trigger(
    ownerUid: string,
    reason: KillReason,
    opts: KillOptions = { flattenAll: true, cancelAll: true },
  ): Promise<void> {
    const now = this.deps.now?.() ?? Date.now();
    const cmd: Command = {
      id: `kill_${now}`,
      ownerUid,
      kind: "KILL",
      idempotencyKey: `kill:${reason}:${now}`,
      payload: { reason, ...opts },
      createdAt: now,
    };
    await this.deps.recordCommand(cmd);
    await this.deps.publishKill(reason, opts);
  }
}
