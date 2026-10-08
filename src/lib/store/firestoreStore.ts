import "server-only";
import { getEnv } from "@/lib/env";
import { nextResetAt, wibDay } from "@/lib/time";
import type { QuotaStore } from "./types";

type DocumentData = Record<string, unknown>;
type DocumentSnapshot = { exists: boolean; data(): DocumentData | undefined };
type DocumentReference = {
  get(): Promise<DocumentSnapshot>;
};
type Transaction = {
  get(reference: DocumentReference): Promise<DocumentSnapshot>;
  set(reference: DocumentReference, value: DocumentData, options?: { merge: boolean }): void;
};
type Store = {
  runTransaction<T>(operation: (transaction: Transaction) => Promise<T>): Promise<T>;
  collection(name: string): { doc(id: string): DocumentReference };
};

let storePromise: Promise<Store> | undefined;

async function getStore(): Promise<Store> {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    const env = getEnv();
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY)
      throw new Error("Firestore belum dikonfigurasi.");
    const [{ getApps, cert, initializeApp }, { getFirestore }] = await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/firestore"),
    ]);
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    return getFirestore(app) as unknown as Store;
  })().catch((error: unknown) => {
    storePromise = undefined;
    throw error;
  });
  return storePromise;
}

export const firestoreStore: QuotaStore = {
  async reserve(service, now, limit) {
    const db = await getStore();
    const day = wibDay(now);
    const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0;
      if (used >= limit) return { ok: false as const, day, used };
      tx.set(
        ref,
        { day, service, used: used + 1, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      return { ok: true as const, day };
    });
  },
  async release(service, day) {
    const db = await getStore();
    const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = Math.max(0, Number(snap.data()?.used ?? 0) - 1);
      tx.set(ref, { used, updatedAt: new Date().toISOString() }, { merge: true });
    });
  },
  async snapshot(services, now, limit) {
    const db = await getStore();
    const day = wibDay(now);
    const resetsAt = nextResetAt(now).toISOString();
    const entries = await Promise.all(
      services.map(async ({ id }) => {
        const snap = await db.collection("vpn_web_quota").doc(`${day}_${id}`).get();
        const used = Number(snap.data()?.used ?? 0);
        return [id, { used, limit, remaining: Math.max(0, limit - used), resetsAt }] as const;
      }),
    );
    return Object.fromEntries(entries);
  },
  async reserveIp(ipHash, service, now, limit) {
    const db = await getStore();
    const timeframe =
      service === "hourly"
        ? `${Math.floor(now.getTime() / 3_600_000)}`
        : `${wibDay(now)}_${service}`;
    const ref = db.collection("vpn_web_ip_limits").doc(`${timeframe}_${ipHash}`);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0;
      if (used >= limit) return { ok: false as const, used };
      const logId = `${timeframe}_${ipHash}_${Date.now()}`;
      tx.set(
        ref,
        { timeframe, ipHash, used: used + 1, updatedAt: new Date().toISOString() },
        { merge: true },
      );
      return { ok: true as const, logId };
    });
  },
};
