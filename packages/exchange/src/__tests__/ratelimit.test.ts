import { describe, it, expect } from "vitest";
import { TokenBucket, type Clock } from "../common/ratelimit.js";

function fakeClock() {
  let t = 0;
  const c: Clock = {
    now: () => t,
    sleep: async (ms) => {
      t += ms;
    },
  };
  return Object.assign(c, { advance: (ms: number) => (t += ms) });
}

describe("TokenBucket", () => {
  it("capacity 만큼 즉시 tryTake 가 가능", () => {
    const b = new TokenBucket(3, 1, fakeClock());
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(false);
  });

  it("시간 경과에 따라 refill 된다", () => {
    const c = fakeClock();
    const b = new TokenBucket(2, 2, c);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(false);
    c.advance(1000); // 1초 = 2 토큰
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(true);
    expect(b.tryTake()).toBe(false);
  });

  it("take 는 충분할 때까지 sleep 한다", async () => {
    const c = fakeClock();
    const b = new TokenBucket(1, 10, c);
    await b.take(); // 첫 토큰
    const before = c.now();
    await b.take(); // 1/10s = 100ms 대기 필요
    expect(c.now()).toBeGreaterThanOrEqual(before + 100);
  });
});
