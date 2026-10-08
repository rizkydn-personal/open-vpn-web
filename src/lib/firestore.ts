import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any -- Firebase Admin is dynamically imported. */
/* Firebase is loaded lazily so a local deployment needs no Firebase credentials. */
import { getEnv } from "@/lib/env";
import { nextResetAt, wibDay } from "@/lib/time";

type Store = {
  runTransaction: (fn: (tx: any) => Promise<unknown>) => Promise<unknown>;
  collection: (name: string) => any;
};
type Reservation = { ok: true; day: string } | { ok: false; day: string; used: number };
type IpReservation = { ok: true; logId: string } | { ok: false; used: number; retryAfter: number };
type Counter = { used: number; expires: number };
const memoryQuota = new Map<string, Counter>();
const memoryIp = new Map<string, Counter>();
let storePromise: Promise<Store> | undefined;
let warnedMemory = false;
let snapshotCache:
  | { value: Record<string, unknown>; expires: number; pending?: Promise<Record<string, unknown>> }
  | undefined;

function selectedStore(): "memory" | "firestore" {
  const env = getEnv();
  return (
    env.QUOTA_STORE ??
    (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
      ? "firestore"
      : "memory")
  );
}

async function firebaseStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => {
      const env = getEnv();
      if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY)
        throw new Error("Konfigurasi Firestore tidak lengkap.");
      try {
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
      } catch {
        throw new Error("Konfigurasi Firestore tidak valid.");
      }
    })();
    storePromise.catch(() => {
      storePromise = undefined;
    });
  }
  return storePromise;
}

function cleanup(map: Map<string, Counter>, now = Date.now()): void {
  for (const [key, value] of map) if (value.expires <= now) map.delete(key);
}
function resetMs(now: Date): number {
  return nextResetAt(now).getTime();
}
function hourResetMs(now: Date): number {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  return date.getTime() + 3_600_000;
}
function invalidate(): void {
  snapshotCache = undefined;
}

export function firestoreEnabled(): boolean {
  return selectedStore() === "firestore";
}
export function quotaStoreName(): "memory" | "firestore" {
  return selectedStore();
}

export async function reserveQuota(
  service: string,
  now: Date,
  limit: number,
): Promise<Reservation> {
  const day = wibDay(now);
  invalidate();
  if (selectedStore() === "memory") {
    if (process.env.NODE_ENV === "production" && !warnedMemory) {
      console.warn("Store kuota memory tidak dibagi antar proses dan hilang saat restart.");
      warnedMemory = true;
    }
    cleanup(memoryQuota);
    const key = `${day}_${service}`;
    const entry = memoryQuota.get(key) ?? { used: 0, expires: resetMs(now) };
    if (entry.used >= limit) return { ok: false, day, used: entry.used };
    entry.used += 1;
    memoryQuota.set(key, entry);
    return { ok: true, day };
  }
  const db = await firebaseStore();
  const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0;
    if (used >= limit) return { ok: false as const, day, used };
    tx.set(
      ref,
      { day, service, used: used + 1, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return { ok: true as const, day };
  }) as Promise<Reservation>;
}

export async function releaseQuota(service: string, day: string): Promise<void> {
  invalidate();
  if (selectedStore() === "memory") {
    const entry = memoryQuota.get(`${day}_${service}`);
    if (entry) entry.used = Math.max(0, entry.used - 1);
    return;
  }
  const db = await firebaseStore();
  const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    tx.set(
      ref,
      {
        used: Math.max(0, Number(snap.data()?.used ?? 0) - 1),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  });
}

async function readSnapshot(
  services: Array<{ id: string }>,
  now: Date,
  limit: number,
): Promise<Record<string, unknown>> {
  const day = wibDay(now);
  const resetsAt = nextResetAt(now).toISOString();
  if (selectedStore() === "memory") {
    cleanup(memoryQuota);
    return Object.fromEntries(
      services.map(({ id }) => {
        const used = memoryQuota.get(`${day}_${id}`)?.used ?? 0;
        return [id, { used, limit, remaining: Math.max(0, limit - used), resetsAt }];
      }),
    );
  }
  const db = await firebaseStore();
  const entries = await Promise.all(
    services.map(async ({ id }) => {
      const snap = await db.collection("vpn_web_quota").doc(`${day}_${id}`).get();
      const used = Number(snap.data()?.used ?? 0);
      return [id, { used, limit, remaining: Math.max(0, limit - used), resetsAt }] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function quotaSnapshot(
  services: Array<{ id: string }>,
  now: Date,
  limit: number,
): Promise<Record<string, { used: number; limit: number; remaining: number; resetsAt: string }>> {
  if (snapshotCache && snapshotCache.expires > Date.now())
    return snapshotCache.pending
      ? (snapshotCache.pending as Promise<
          Record<string, { used: number; limit: number; remaining: number; resetsAt: string }>
        >)
      : (snapshotCache.value as Record<
          string,
          { used: number; limit: number; remaining: number; resetsAt: string }
        >);
  const pending = readSnapshot(services, now, limit);
  snapshotCache = { value: {}, expires: Date.now() + 5000, pending };
  try {
    const value = await pending;
    snapshotCache = { value, expires: Date.now() + 5000 };
    return value as Record<
      string,
      { used: number; limit: number; remaining: number; resetsAt: string }
    >;
  } catch (error) {
    snapshotCache = undefined;
    throw error;
  }
}

export async function reserveIpQuota(
  ipHash: string,
  service: string,
  now: Date,
  hourlyLimit: number,
  dailyLimit: number,
): Promise<IpReservation> {
  const hour = Math.floor(now.getTime() / 3_600_000).toString();
  const day = wibDay(now);
  if (selectedStore() === "memory") {
    cleanup(memoryIp);
    const hourKey = `h_${hour}_${ipHash}`;
    const dayKey = `d_${day}_${ipHash}_${service}`;
    const hourly = memoryIp.get(hourKey) ?? { used: 0, expires: hourResetMs(now) };
    const daily = memoryIp.get(dayKey) ?? { used: 0, expires: resetMs(now) };
    if (hourly.used >= hourlyLimit || daily.used >= dailyLimit)
      return {
        ok: false,
        used: Math.max(hourly.used, daily.used),
        retryAfter: Math.ceil((Math.min(hourly.expires, daily.expires) - now.getTime()) / 1000),
      };
    hourly.used += 1;
    daily.used += 1;
    memoryIp.set(hourKey, hourly);
    memoryIp.set(dayKey, daily);
    return { ok: true, logId: `${hour}_${ipHash}_${Date.now()}` };
  }
  const db = await firebaseStore();
  const hourRef = db.collection("vpn_web_ip_limits").doc(`h_${hour}_${ipHash}`);
  const dayRef = db.collection("vpn_web_ip_limits").doc(`d_${day}_${ipHash}_${service}`);
  return db.runTransaction(async (tx: any) => {
    const [hourSnap, daySnap] = await Promise.all([tx.get(hourRef), tx.get(dayRef)]);
    const h = Number(hourSnap.data()?.used ?? 0);
    const d = Number(daySnap.data()?.used ?? 0);
    if (h >= hourlyLimit || d >= dailyLimit)
      return {
        ok: false as const,
        used: Math.max(h, d),
        retryAfter: Math.ceil((Math.min(hourResetMs(now), resetMs(now)) - now.getTime()) / 1000),
      };
    tx.set(
      hourRef,
      { hour, ipHash, used: h + 1, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    tx.set(
      dayRef,
      { day, ipHash, service, used: d + 1, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    return { ok: true as const, logId: `${hour}_${ipHash}_${Date.now()}` };
  }) as Promise<IpReservation>;
}

export function resetMemoryStoreForTests(): void {
  memoryQuota.clear();
  memoryIp.clear();
  snapshotCache = undefined;
}
