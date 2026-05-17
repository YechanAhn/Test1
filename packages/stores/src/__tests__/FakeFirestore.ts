import type {
  CollRefLike,
  DocRefLike,
  DocSnapshotLike,
  FirestoreLike,
  QueryLike,
  QuerySnapshotLike,
} from "../firestore/types.js";

type AnyRecord = Record<string, unknown>;

interface Filter {
  field: string;
  op: "==" | ">" | "<" | ">=" | "<=";
  value: unknown;
}

interface Order {
  field: string;
  dir: "asc" | "desc";
}

function getField(obj: AnyRecord, field: string): unknown {
  return field.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as AnyRecord)[k];
    return undefined;
  }, obj);
}

function applyFilter(items: AnyRecord[], f: Filter): AnyRecord[] {
  return items.filter((it) => {
    const v = getField(it, f.field) as number | string | undefined;
    if (v === undefined) return false;
    switch (f.op) {
      case "==":
        return v === f.value;
      case ">":
        return v > (f.value as number);
      case "<":
        return v < (f.value as number);
      case ">=":
        return v >= (f.value as number);
      case "<=":
        return v <= (f.value as number);
    }
  });
}

export class FakeFirestore implements FirestoreLike {
  private collections = new Map<string, Map<string, AnyRecord>>();

  private getColl(path: string): Map<string, AnyRecord> {
    let c = this.collections.get(path);
    if (!c) {
      c = new Map();
      this.collections.set(path, c);
    }
    return c;
  }

  collection<T = AnyRecord>(path: string): CollRefLike<T> {
    const store = this.getColl(path);
    return new FakeQuery<T>(store, [], []);
  }
}

class FakeQuery<T> implements CollRefLike<T> {
  constructor(
    private readonly store: Map<string, AnyRecord>,
    private readonly filters: Filter[],
    private readonly orders: Order[],
    private readonly limitN: number | null = null,
  ) {}

  doc(id: string): DocRefLike<T> {
    return {
      id,
      get: async () => {
        const data = this.store.get(id);
        const snap: DocSnapshotLike<T> = {
          exists: data !== undefined,
          id,
          data: () => (data ? (structuredClone(data) as T) : undefined),
        };
        return snap;
      },
      set: async (data: T) => {
        this.store.set(id, structuredClone(data as AnyRecord));
      },
    };
  }

  where(field: string, op: Filter["op"], value: unknown): QueryLike<T> {
    return new FakeQuery<T>(
      this.store,
      [...this.filters, { field, op, value }],
      this.orders,
      this.limitN,
    );
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): QueryLike<T> {
    return new FakeQuery<T>(
      this.store,
      this.filters,
      [...this.orders, { field, dir }],
      this.limitN,
    );
  }

  limit(n: number): QueryLike<T> {
    return new FakeQuery<T>(this.store, this.filters, this.orders, n);
  }

  async get(): Promise<QuerySnapshotLike<T>> {
    let items: { id: string; data: AnyRecord }[] = [];
    for (const [id, data] of this.store) items.push({ id, data });
    let filtered = items.map((i) => i.data);
    for (const f of this.filters) filtered = applyFilter(filtered, f);
    // 항목 id 보존을 위해 다시 묶기
    const remainingIds = new Set(filtered);
    items = items.filter((i) => remainingIds.has(i.data));

    for (const o of this.orders) {
      items.sort((a, b) => {
        const av = getField(a.data, o.field) as number;
        const bv = getField(b.data, o.field) as number;
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (o.dir === "asc" ? 1 : -1);
      });
    }
    if (this.limitN !== null) items = items.slice(0, this.limitN);

    const docs: DocSnapshotLike<T>[] = items.map(({ id, data }) => ({
      exists: true,
      id,
      data: () => structuredClone(data) as T,
    }));
    return { docs };
  }
}
