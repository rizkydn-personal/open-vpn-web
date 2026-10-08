import "server-only";
import { getEnv } from "@/lib/env";
import { nextResetAt, wibDay } from "@/lib/time";
import type { QuotaStore } from "./types";

type Store = { runTransaction: (fn: (tx: any) => Promise<unknown>) => Promise<unknown>; collection: (name: string) => any };
let storePromise: Promise<Store> | undefined;

async function getStore(): Promise<Store> {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    try {
      const env = getEnv();
      if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
        throw new Error("Firestore is not configured. Missing FIREBASE_* env vars.");
      }
      
      const [{ getApps, cert, initializeApp }, { getFirestore }] = await Promise.all([
        import("firebase-admin/app"), import("firebase-admin/firestore"),
      ]);
      const apps = getApps();
      let credential;
      try {
        credential = cert({ 
          projectId: env.FIREBASE_PROJECT_ID, 
          clientEmail: env.FIREBASE_CLIENT_EMAIL, 
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") 
        });
      } catch (err: any) {
        throw new Error("Firestore configuration error: Invalid credentials provided.");
      }
      const app = apps[0] ?? initializeApp({ credential });
      return getFirestore(app) as unknown as Store;
    } catch (e) {
      storePromise = undefined;
      throw e;
    }
  })();
  return storePromise;
}

export const firestoreStore: QuotaStore = {
  async reserve(service, now, limit) {
    const db = await getStore();
    const day = wibDay(now);
    const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
    return db.runTransaction(async (tx: any) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0;
      if (used >= limit) return { ok: false as const, day, used };
      tx.set(ref, { day, service, used: used + 1, updatedAt: new Date().toISOString() }, { merge: true });
      return { ok: true as const, day };
    }) as Promise<any>;
  },
  async release(service, day) {
    const db = await getStore();
    const ref = db.collection("vpn_web_quota").doc(`${day}_${service}`);
    await db.runTransaction(async (tx: any) => { 
      const snap = await tx.get(ref); 
      const used = Math.max(0, Number(snap.data()?.used ?? 0) - 1); 
      tx.set(ref, { used, updatedAt: new Date().toISOString() }, { merge: true }); 
    });
  },
  async snapshot(services, now, limit) {
    const db = await getStore();
    const day = wibDay(now);
    const resetsAt = nextResetAt(now).toISOString();
    const entries = await Promise.all(services.map(async ({ id }) => { 
      const snap = await db.collection("vpn_web_quota").doc(`${day}_${id}`).get(); 
      const used = Number(snap.data()?.used ?? 0); 
      return [id, { used, limit, remaining: Math.max(0, limit - used), resetsAt }] as const; 
    }));
    return Object.fromEntries(entries);
  },
  async reserveIp(ipHash, service, now, limit) {
    const db = await getStore();
    const timeframe = service === "hourly" ? `${Math.floor(now.getTime() / 3600000)}` : `${wibDay(now)}_${service}`;
    const ref = db.collection("vpn_web_ip_limits").doc(`${timeframe}_${ipHash}`);
    return db.runTransaction(async (tx: any) => { 
      const snap = await tx.get(ref); 
      const used = snap.exists ? Number(snap.data()?.used ?? 0) : 0; 
      if (used >= limit) return { ok: false as const, used }; 
      const id = `${timeframe}_${ipHash}_${Date.now()}`; 
      tx.set(ref, { timeframe, ipHash, used: used + 1, updatedAt: new Date().toISOString() }, { merge: true }); 
      return { ok: true as const, logId: id }; 
    }) as Promise<any>;
  }
};
