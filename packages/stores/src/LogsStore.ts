export interface LogEntry {
  ts: number;
  level: "debug" | "info" | "warn" | "error";
  topic: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface LogsStore {
  /** JSONL 추가(append-only). 카테고리는 토픽 그룹(예: "trader", "watcher"). */
  append(category: string, entries: LogEntry[]): Promise<void>;
  /** 카테고리/시간범위 단위 조회. */
  read(category: string, range: { fromTs: number; toTs: number }): Promise<LogEntry[]>;
}
