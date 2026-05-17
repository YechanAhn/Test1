import { MemoryCommandStore } from "../memory/CommandStore.memory.js";
import { MemoryStateStore } from "../memory/StateStore.memory.js";
import { MemorySnapshotStore } from "../memory/SnapshotStore.memory.js";
import { FirestoreCommandStore } from "../firestore/CommandStore.firestore.js";
import { FirestoreStateStore } from "../firestore/StateStore.firestore.js";
import { FirestoreSnapshotStore } from "../firestore/SnapshotStore.firestore.js";

import { commandStoreContract } from "./CommandStore.contract.js";
import { stateStoreContract } from "./StateStore.contract.js";
import { snapshotStoreContract } from "./SnapshotStore.contract.js";

import { FakeFirestore } from "./FakeFirestore.js";

commandStoreContract("memory", () => new MemoryCommandStore());
commandStoreContract("firestore(fake)", () => new FirestoreCommandStore(new FakeFirestore()));

stateStoreContract("memory", () => new MemoryStateStore());
stateStoreContract("firestore(fake)", () => new FirestoreStateStore(new FakeFirestore()));

snapshotStoreContract("memory", () => new MemorySnapshotStore());
snapshotStoreContract("firestore(fake)", () => new FirestoreSnapshotStore(new FakeFirestore()));
