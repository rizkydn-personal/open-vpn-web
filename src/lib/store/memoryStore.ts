import { nextResetAt, wibDay } from "@/lib/time";
import type { QuotaStore } from "./types";

type QuotaSnapshot = {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
};

const quotaMap = new Map<string, number>();
const ipLimitMap = new Map<string, number>();
let lastClean = Date.now();

function cleanUp(nowMs: number): void {
  if (nowMs - lastClean < 3_600_000) return;
  const today = wibDay(new Date(nowMs));
  const currentHour = `${Math.floor(nowMs / 3_600_000)}`;
  for (const key of quotaMap.keys()) if (!key.startsWith(today)) quotaMap.delete(key);
  for (const key of ipLimitMap.keys()) if (!key.startsWith(currentHour)) ipLimitMap.delete(key);
  lastClean = nowMs;
}

export const memoryStore: QuotaStore = {
  async reserve(service, now, limit) {
    cleanUp(now.getTime());
    const day = wibDay(now);
    const key = `${day}_${service}`;
    const used = quotaMap.get(key) ?? 0;
    if (used >= limit) return { ok: false, day, used };
    quotaMap.set(key, used + 1);
    return { ok: true, day };
  },
  async release(service, day) {
    const key = `${day}_${service}`;
    const used = quotaMap.get(key) ?? 0;
    if (used > 0) quotaMap.set(key, used - 1);
  },
  async snapshot(services, now, limit) {
    cleanUp(now.getTime());
    const day = wibDay(now);
    const resetsAt = nextResetAt(now).toISOString();
    const result: Record<string, QuotaSnapshot> = {};
    for (const service of services) {
      const used = quotaMap.get(`${day}_${service.id}`) ?? 0;
      result[service.id] = { used, limit, remaining: Math.max(0, limit - used), resetsAt };
    }
    return result;
  },
  async reserveIp(ipHash, service, now, limit) {
    cleanUp(now.getTime());
    const timeframe =
      service === "hourly"
        ? `${Math.floor(now.getTime() / 3_600_000)}`
        : `${wibDay(now)}_${service}`;
    const key = `${timeframe}_${ipHash}`;
    const used = ipLimitMap.get(key) ?? 0;
    if (used >= limit) return { ok: false, used };
    ipLimitMap.set(key, used + 1);
    return { ok: true, logId: `${key}_${Date.now()}` };
  },
};
