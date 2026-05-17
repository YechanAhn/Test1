import { describe, it, expect } from "vitest";
import { MemoryLogsStore } from "../memory/LogsStore.memory.js";

describe("MemoryLogsStore", () => {
  it("append/read 라운드트립", async () => {
    const s = new MemoryLogsStore();
    await s.append("trader", [
      { ts: 100, level: "info", topic: "trader.order", message: "x" },
      { ts: 200, level: "warn", topic: "trader.fill", message: "y" },
    ]);
    const got = await s.read("trader", { fromTs: 0, toTs: 1000 });
    expect(got).toHaveLength(2);
  });

  it("read 는 시간 범위 필터를 적용한다", async () => {
    const s = new MemoryLogsStore();
    await s.append("trader", [
      { ts: 100, level: "info", topic: "t", message: "a" },
      { ts: 200, level: "info", topic: "t", message: "b" },
      { ts: 300, level: "info", topic: "t", message: "c" },
    ]);
    const got = await s.read("trader", { fromTs: 150, toTs: 250 });
    expect(got.map((e) => e.message)).toEqual(["b"]);
  });
});
