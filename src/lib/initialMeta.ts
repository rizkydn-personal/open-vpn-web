import "server-only";
import { getEnv } from "@/lib/env";
import { getServices, getStatus } from "@/lib/vpnApi";
import { quotaSnapshot } from "@/lib/firestore";
import type { Meta } from "@/components/Portal";
export async function initialMeta(): Promise<Meta> {
  const env = getEnv();
  const [s, t] = await Promise.allSettled([getServices(), getStatus()]);
  const services = s.status === "fulfilled" ? s.value.value : [];
  const status = t.status === "fulfilled" ? t.value.value : null;
  let quota = {};
  let quotaUnavailable = false;
  try {
    quota = await quotaSnapshot(services, new Date(), env.DAILY_LIMIT_PER_SERVICE);
  } catch {
    quotaUnavailable = true;
  }
  return {
    services,
    status,
    quota,
    quotaUnavailable,
    unavailable:
      s.status !== "fulfilled" ||
      t.status !== "fulfilled" ||
      (s.status === "fulfilled" && s.value.stale) ||
      (t.status === "fulfilled" && t.value.stale),
    allowed_days: env.ALLOWED_DAYS,
    support_url: env.SUPPORT_URL || undefined,
    turnstile_site_key: env.TURNSTILE_SITE_KEY || undefined,
  };
}
