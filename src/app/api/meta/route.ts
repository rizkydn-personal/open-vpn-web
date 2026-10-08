import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getServices, getStatus } from "@/lib/vpnApi";
import { getSiteSettings, quotaSnapshot } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();
  const [serviceResult, statusResult, siteResult] = await Promise.allSettled([
    getServices(),
    getStatus(),
    getSiteSettings(),
  ]);
  const services = serviceResult.status === "fulfilled" ? serviceResult.value.value : [];
  const status = statusResult.status === "fulfilled" ? statusResult.value.value : null;
  const stale =
    (serviceResult.status === "fulfilled" && serviceResult.value.stale) ||
    (statusResult.status === "fulfilled" && statusResult.value.stale);
  const unavailable =
    serviceResult.status === "rejected" || statusResult.status === "rejected" || stale;
  let quota = {};
  let quotaUnavailable = false;
  try {
    quota = await quotaSnapshot(
      services,
      new Date(),
      Object.fromEntries(
        services.map((service) => [service.id, service.daily_limit ?? env.DAILY_LIMIT_PER_SERVICE]),
      ),
    );
  } catch {
    quotaUnavailable = true;
  }
  return NextResponse.json(
    {
      data: {
        services,
        catalogUnavailable: serviceResult.status !== "fulfilled" || serviceResult.value.stale,
        catalogFetchedAt:
          serviceResult.status === "fulfilled" ? serviceResult.value.fetchedAt : undefined,
        statusUnavailable: statusResult.status !== "fulfilled" || statusResult.value.stale,
        status,
        statusFetchedAt:
          statusResult.status === "fulfilled" ? statusResult.value.fetchedAt : undefined,
        serverNow: new Date().toISOString(),
        quota,
        quotaUnavailable,
        unavailable,
        stale,
        allowed_days: env.ALLOWED_DAYS,
        support_url: env.SUPPORT_URL || undefined,
        turnstile_site_key: env.TURNSTILE_SITE_KEY || undefined,
        siteMode: siteResult.status === "fulfilled" ? siteResult.value?.mode : undefined,
        siteMessage: siteResult.status === "fulfilled" ? siteResult.value?.message : undefined,
        pausedServices:
          siteResult.status === "fulfilled" ? siteResult.value?.pausedServices : undefined,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
