import "server-only";
import { getEnv } from "@/lib/env";
import { firestoreStore } from "./firestoreStore";
import { memoryStore } from "./memoryStore";
import type { QuotaStore } from "./types";
import type { Service } from "@/lib/vpnApi";

let warned = false;

export function getStore(): QuotaStore {
  const env = getEnv();
  const envPref = env.QUOTA_STORE;
  
  let useMem = false;
  if (envPref === "memory") {
    useMem = true;
  } else if (envPref === "firestore") {
    useMem = false;
  } else {
    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      useMem = false;
    } else {
      useMem = true;
    }
  }

  if (useMem) {
    if (process.env.NODE_ENV === "production" && !warned) {
      console.warn("kuota tidak dibagi antar proses dan hilang saat restart");
      warned = true;
    }
    return memoryStore;
  }
  return firestoreStore;
}

export function reserveQuota(service: string, now: Date, limit: number) {
  return getStore().reserve(service, now, limit);
}

export function releaseQuota(service: string, day: string) {
  return getStore().release(service, day);
}

export function quotaSnapshot(services: Service[], now: Date, limit: number) {
  return getStore().snapshot(services, now, limit);
}

export function reserveIpQuota(ipHash: string, service: string, now: Date, limit: number) {
  return getStore().reserveIp(ipHash, service, now, limit);
}

export type { QuotaStore } from "./types";

