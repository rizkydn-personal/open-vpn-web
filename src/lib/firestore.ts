import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any -- Firebase Admin types are loaded dynamically for optional deployment support. */
import { getEnv } from "@/lib/env";
import { nextResetAt, wibDay } from "@/lib/time";

type Store = { runTransaction: (fn: (tx: any) => Promise<unknown>) => Promise<unknown>; collection: (name: string) => any };
let storePromise: Promise<Store | null> | undefined;

async function getStore(): Promise<Store | null> {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    const env = getEnv();
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) return null;
    const [{ getApps, cert, initializeApp }, { getFirestore }] = await Promise.all([
      import("firebase-admin/app"), import("firebase-admin/firestore"),
    ]);
    const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
    return getFirestore(app) as unknown as Store;
  })();
  return storePromise;
}

export function firestoreEnabled(): boolean {
  const env = getEnv();
  return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}

export async function reserveQuota(service: string, now: Date, limit: number) {
  return firestoreReserve(service, wibDay(now), limit);
}
export async function releaseQuota(service: string, day: string) {
  return firestoreRelease(service, day);
}
export async function quotaSnapshot(services: Array<{ id: string }>, now: Date, limit: number) {
  return firestoreSnapshot(services, wibDay(now), nextResetAt(now).toISOString(), limit);
}
export async function reserveIpQuota(ipHash: string, service: string, now: Date, limit: number) {
  return firestoreReserveIp(ipHash, service, `${Math.floor(now.getTime() / 3600000)}`, limit);
}
export async function finishIpQuota(_logId: number | string, _outcome: "ok" | "fail" | "unknown") {
  void _logId; void _outcome;
  return;
}

export async function firestoreReserve(service: string, day: string, limit: number): Promise<{ ok: true; day: string } | { ok: false; day: string; used: number }> {
  const db = await getStore(); if (!db) throw new Error("Firestore is not configured");
  const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref); const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0;
    if (used >= limit) return { ok: false as const, day, used };
    tx.set(ref, { day, service, used: used + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return { ok: true as const, day };
  }) as Promise<any>;
}

export async function firestoreRelease(service: string, day: string): Promise<void> {
  const db = await getStore(); if (!db) throw new Error("Firestore is not configured");
  const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
  await db.runTransaction(async (tx: any) => { const snap = await tx.get(ref); const used = Math.max(0, Number(snap.data()?.used ?? 0) - 1); tx.set(ref, { used, updatedAt: new Date().toISOString() }, { merge: true }); });
}

export async function firestoreSnapshot(services: Array<{ id: string }>, day: string, resetsAt: string, limit: number) {
  const db = await getStore(); if (!db) throw new Error("Firestore is not configured");
  const entries = await Promise.all(services.map(async ({ id }) => { const snap = await db.collection("vpn_web_quota").doc(`${day}_${id}`).get(); const used = Number(snap.data()?.used ?? 0); return [id, { used, limit, remaining: Math.max(0, limit - used), resetsAt }] as const; }));
  return Object.fromEntries(entries);
}

export async function firestoreReserveIp(ipHash: string, service: string, hour: string, limit: number): Promise<{ ok: true; logId: string } | { ok: false; used: number }> {
  const db = await getStore(); if (!db) throw new Error("Firestore is not configured");
  const ref = db.collection("vpn_web_ip_limits").doc(`${hour}_${ipHash}`);
  return db.runTransaction(async (tx: any) => { const snap = await tx.get(ref); const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0; if (used >= limit) return { ok: false as const, used }; const id = `${hour}_${ipHash}_${Date.now()}`; tx.set(ref, { hour, ipHash, used: used + 1, updatedAt: new Date().toISOString() }, { merge: true }); return { ok: true as const, logId: id }; }) as Promise<any>;
}
