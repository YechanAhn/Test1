import type { Command } from "@alrgo/core-types";

export interface CommandResult {
  commandId: string;
  ok: boolean;
  message?: string;
  recordedAt: number;
}

export interface CommandQuery {
  ownerUid: string;
  limit?: number;
  afterCreatedAt?: number;
}

export interface CommandStore {
  /**
   * 멱등 생성. 동일 idempotencyKey 가 이미 있으면 기존 Command 를 반환하고 새로 만들지 않는다.
   */
  create(cmd: Command): Promise<{ command: Command; created: boolean }>;
  get(commandId: string): Promise<Command | null>;
  listByOwner(q: CommandQuery): Promise<Command[]>;
  recordResult(result: CommandResult): Promise<void>;
  getResult(commandId: string): Promise<CommandResult | null>;
}
