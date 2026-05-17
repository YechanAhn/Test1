/**
 * Symbol → Shard 라우팅. 안정적 해시(djb2 변종)로 같은 심볼은 항상 같은 샤드.
 * 샤드 추가/제거 시 일관성을 위해 ConsistentHashRouter 도 함께 제공.
 */

export interface Router {
  route(symbol: string): string | undefined;
  setActiveShards(shardIds: string[]): void;
  activeShards(): readonly string[];
}

/** FNV-1a 32-bit + post-mix. sequential 문자열에서 안정적인 분포. */
function djb2(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** 단순 mod 라우터: 샤드 수가 바뀌면 분포가 크게 흔들림. 작은 N 에 적합. */
export class ModRouter implements Router {
  private shards: string[] = [];
  setActiveShards(shardIds: string[]) {
    this.shards = [...shardIds];
  }
  activeShards() {
    return this.shards;
  }
  route(symbol: string): string | undefined {
    if (this.shards.length === 0) return undefined;
    const idx = djb2(symbol) % this.shards.length;
    return this.shards[idx];
  }
}

/** 일관 해시 라우터. 가상 노드(VN) 로 균일 분포. 샤드 변동 시 최소 재배치. */
export class ConsistentHashRouter implements Router {
  private ring: { hash: number; shardId: string }[] = [];
  private shards: string[] = [];

  constructor(private readonly virtualNodes: number = 64) {}

  setActiveShards(shardIds: string[]): void {
    this.shards = [...shardIds];
    this.ring = [];
    for (const s of shardIds) {
      for (let v = 0; v < this.virtualNodes; v++) {
        this.ring.push({ hash: djb2(`${s}#${v}`), shardId: s });
      }
    }
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  activeShards(): readonly string[] {
    return this.shards;
  }

  route(symbol: string): string | undefined {
    if (this.ring.length === 0) return undefined;
    const h = djb2(symbol);
    // 이진 탐색: 다음으로 큰 hash 의 shard
    let lo = 0;
    let hi = this.ring.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.ring[mid]!.hash < h) lo = mid + 1;
      else hi = mid;
    }
    const idx = lo === this.ring.length ? 0 : lo;
    return this.ring[idx]!.shardId;
  }
}
