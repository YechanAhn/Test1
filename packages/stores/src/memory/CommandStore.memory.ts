import type { Command } from "@alrgo/core-types";
import type { CommandQuery, CommandResult, CommandStore } from "../CommandStore.js";

export class MemoryCommandStore implements CommandStore {
  private byId = new Map<string, Command>();
  private byIdemKey = new Map<string, string>();
  private results = new Map<string, CommandResult>();

  async create(cmd: Command): Promise<{ command: Command; created: boolean }> {
    const existingId = this.byIdemKey.get(cmd.idempotencyKey);
    if (existingId) {
      const existing = this.byId.get(existingId)!;
      return { command: existing, created: false };
    }
    this.byId.set(cmd.id, cmd);
    this.byIdemKey.set(cmd.idempotencyKey, cmd.id);
    return { command: cmd, created: true };
  }

  async get(commandId: string): Promise<Command | null> {
    return this.byId.get(commandId) ?? null;
  }

  async listByOwner(q: CommandQuery): Promise<Command[]> {
    const all = [...this.byId.values()]
      .filter((c) => c.ownerUid === q.ownerUid)
      .filter((c) => (q.afterCreatedAt ? c.createdAt > q.afterCreatedAt : true))
      .sort((a, b) => b.createdAt - a.createdAt);
    return q.limit ? all.slice(0, q.limit) : all;
  }

  async recordResult(result: CommandResult): Promise<void> {
    this.results.set(result.commandId, result);
  }

  async getResult(commandId: string): Promise<CommandResult | null> {
    return this.results.get(commandId) ?? null;
  }
}
