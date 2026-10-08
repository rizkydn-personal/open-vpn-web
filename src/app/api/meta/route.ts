import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getServices, getStatus } from "@/lib/vpnApi";
import { quotaSnapshot } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();
  const [serviceResult, statusResult] = await Promise.allSettled([getServices(), getStatus()]);
  const services = serviceResult.status === "fulfilled" ? serviceResult.value.value : [];
  const status = statusResult.status === "fulfilled" ? statusResult.value.value : null;
  const stale = (serviceResult.status === "fulfilled" && serviceResult.value.stale)
    || (statusResult.status === "fulfilled" && statusResult.value.stale);
  const unavailable = serviceResult.status === "rejected" || statusResult.status === "rejected" || stale;
  let quota = {};
  let quotaUnavailable = false;
  try { quota = await quotaSnapshot(services, new Date(), env.DAILY_LIMIT_PER_SERVICE); } catch { quotaUnavailable = true; }
  return NextResponse.json({ data: {
    services,
    status,
    quota,
    quotaUnavailable,
    unavailable,
    stale,
    allowed_days: env.ALLOWED_DAYS,
    support_url: env.SUPPORT_URL || undefined,
    turnstile_site_key: env.TURNSTILE_SITE_KEY || undefined,
  } }, { headers: { "Cache-Control": "no-store" } });
}
