import { describe, it, expect } from "vitest";
import { ConsistentHashRouter, ModRouter } from "../routing.js";

describe("ModRouter", () => {
  it("같은 심볼은 항상 같은 샤드", () => {
    const r = new ModRouter();
    r.setActiveShards(["s1", "s2", "s3"]);
    const first = r.route("BTC/USDT:USDT")!;
    for (let i = 0; i < 100; i++) {
      expect(r.route("BTC/USDT:USDT")).toBe(first);
    }
  });

  it("샤드가 없으면 undefined", () => {
    const r = new ModRouter();
    r.setActiveShards([]);
    expect(r.route("BTC/USDT:USDT")).toBeUndefined();
  });
});

describe("ConsistentHashRouter", () => {
  it("같은 심볼은 항상 같은 샤드", () => {
    const r = new ConsistentHashRouter(32);
    r.setActiveShards(["s1", "s2", "s3"]);
    const first = r.route("BTC/USDT:USDT")!;
    for (let i = 0; i < 100; i++) {
      expect(r.route("BTC/USDT:USDT")).toBe(first);
    }
  });

  it("샤드 추가 시 대부분의 심볼은 같은 샤드 유지 (재배치 최소화)", () => {
    const symbols = Array.from({ length: 200 }, (_, i) => `SYM${i}/USDT:USDT`);
    const r1 = new ConsistentHashRouter(64);
    r1.setActiveShards(["a", "b", "c"]);
    const before = symbols.map((s) => r1.route(s));
    r1.setActiveShards(["a", "b", "c", "d"]);
    const after = symbols.map((s) => r1.route(s));
    const moved = before.filter((b, i) => b !== after[i]).length;
    // ideal: ~1/4 = 25%, < 40% 안에 들면 일관 해시가 동작
    expect(moved / symbols.length).toBeLessThan(0.4);
  });

  it("분포가 너무 치우치지 않는다", () => {
    const r = new ConsistentHashRouter(128);
    r.setActiveShards(["s1", "s2", "s3", "s4"]);
    const counts = { s1: 0, s2: 0, s3: 0, s4: 0 };
    for (let i = 0; i < 1000; i++) {
      const id = r.route(`SYM${i}`) as keyof typeof counts;
      counts[id]++;
    }
    const max = Math.max(...Object.values(counts));
    const min = Math.min(...Object.values(counts));
    expect(max / min).toBeLessThan(2);
  });
});
