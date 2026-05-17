/**
 * Token bucket. capacity 토큰을 가지고, refillPerSec 만큼 시간당 채워진다.
 * 외부 시계 주입(testable) — 기본은 Date.now / setTimeout 사용.
 */
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export class TokenBucket {
  private tokens: number;
  private lastRefillTs: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
    private readonly clock: Clock = realClock,
  ) {
    this.tokens = capacity;
    this.lastRefillTs = clock.now();
  }

  private refill(): void {
    const now = this.clock.now();
    const elapsed = (now - this.lastRefillTs) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.lastRefillTs = now;
  }

  /** N 토큰을 즉시 차감하거나 false 반환. */
  tryTake(n = 1): boolean {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  /** N 토큰을 받을 때까지 대기. */
  async take(n = 1): Promise<void> {
    while (!this.tryTake(n)) {
      this.refill();
      const deficit = n - this.tokens;
      const waitMs = Math.max(10, Math.ceil((deficit / this.refillPerSec) * 1000));
      await this.clock.sleep(waitMs);
    }
  }

  available(): number {
    this.refill();
    return this.tokens;
  }
}
