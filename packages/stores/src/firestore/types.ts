/**
 * Firestore Admin SDK 의존 없이 사용할 수 있도록 만든 최소 인터페이스.
 * 실제 코드에서는 `firebase-admin/firestore` 의 Firestore 인스턴스를 그대로 주입해도
 * 구조적 호환을 통해 동작한다. 테스트에서는 FakeFirestore 를 주입한다.
 */
export interface DocSnapshotLike<T> {
  exists: boolean;
  id: string;
  data(): T | undefined;
}

export interface QuerySnapshotLike<T> {
  docs: DocSnapshotLike<T>[];
}

export interface DocRefLike<T> {
  id: string;
  get(): Promise<DocSnapshotLike<T>>;
  set(data: T): Promise<void>;
}

export interface QueryLike<T> {
  where(field: string, op: "==" | ">" | "<" | ">=" | "<=", value: unknown): QueryLike<T>;
  orderBy(field: string, dir?: "asc" | "desc"): QueryLike<T>;
  limit(n: number): QueryLike<T>;
  get(): Promise<QuerySnapshotLike<T>>;
}

export interface CollRefLike<T> extends QueryLike<T> {
  doc(id: string): DocRefLike<T>;
}

export interface FirestoreLike {
  collection<T = Record<string, unknown>>(path: string): CollRefLike<T>;
}
