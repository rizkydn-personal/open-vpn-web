export interface QuotaStore {
  reserve(service: string, now: Date, limit: number): Promise<{ ok: true; day: string } | { ok: false; day: string; used: number }>;
  release(service: string, day: string): Promise<void>;
  snapshot(services: Array<{ id: string }>, now: Date, limit: number): Promise<Record<string, { used: number; limit: number; remaining: number; resetsAt: string }>>;
  reserveIp(ipHash: string, service: string, now: Date, limit: number): Promise<{ ok: true; logId: string } | { ok: false; used: number }>;
}
