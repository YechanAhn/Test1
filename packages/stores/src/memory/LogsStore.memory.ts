import type { LogEntry, LogsStore } from "../LogsStore.js";

export class MemoryLogsStore implements LogsStore {
  private byCategory = new Map<string, LogEntry[]>();

  async append(category: string, entries: LogEntry[]): Promise<void> {
    const arr = this.byCategory.get(category) ?? [];
    arr.push(...entries);
    this.byCategory.set(category, arr);
  }

  async read(category: string, range: { fromTs: number; toTs: number }): Promise<LogEntry[]> {
    const arr = this.byCategory.get(category) ?? [];
    return arr.filter((e) => e.ts >= range.fromTs && e.ts <= range.toTs);
  }
}
