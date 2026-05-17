import type { Command } from "@alrgo/core-types";
import type { CommandQuery, CommandResult, CommandStore } from "../CommandStore.js";
import type { FirestoreLike } from "./types.js";

const COMMANDS = "commands";

export class FirestoreCommandStore implements CommandStore {
  constructor(private readonly db: FirestoreLike) {}

  async create(cmd: Command): Promise<{ command: Command; created: boolean }> {
    // Solo 봇이라 트랜잭션 없이 idempotencyKey 기반 선검사 → write.
    // 본 구현은 동시 호출 안정성을 위해 추후 Firestore 트랜잭션으로 강화할 수 있다(TODO M8).
    const coll = this.db.collection<Command>(COMMANDS);
    const existing = await coll
      .where("ownerUid", "==", cmd.ownerUid)
      .where("idempotencyKey", "==", cmd.idempotencyKey)
      .limit(1)
      .get();
    if (existing.docs.length > 0) {
      const data = existing.docs[0]!.data();
      if (data) return { command: data, created: false };
    }
    await coll.doc(cmd.id).set(cmd);
    return { command: cmd, created: true };
  }

  async get(commandId: string): Promise<Command | null> {
    const snap = await this.db.collection<Command>(COMMANDS).doc(commandId).get();
    return snap.exists ? snap.data() ?? null : null;
  }

  async listByOwner(q: CommandQuery): Promise<Command[]> {
    let query = this.db.collection<Command>(COMMANDS).where("ownerUid", "==", q.ownerUid);
    if (q.afterCreatedAt) query = query.where("createdAt", ">", q.afterCreatedAt);
    query = query.orderBy("createdAt", "desc");
    if (q.limit) query = query.limit(q.limit);
    const snap = await query.get();
    return snap.docs.map((d) => d.data()).filter((x): x is Command => x !== undefined);
  }

  async recordResult(result: CommandResult): Promise<void> {
    await this.db
      .collection<CommandResult>(`${COMMANDS}/${result.commandId}/result`)
      .doc("latest")
      .set(result);
  }

  async getResult(commandId: string): Promise<CommandResult | null> {
    const snap = await this.db
      .collection<CommandResult>(`${COMMANDS}/${commandId}/result`)
      .doc("latest")
      .get();
    return snap.exists ? snap.data() ?? null : null;
  }
}
