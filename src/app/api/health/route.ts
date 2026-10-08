import { NextResponse } from "next/server";
import { checkQuotaStore } from "@/lib/firestore";
import { getServices, getStatus } from "@/lib/vpnApi";

export const dynamic = "force-dynamic";

export async function GET() {
  const [storeResult, servicesResult, statusResult] = await Promise.allSettled([
    checkQuotaStore(),
    getServices(),
    getStatus(),
  ]);
  const store = storeResult.status === "fulfilled" ? storeResult.value : "unavailable";
  const api =
    servicesResult.status === "fulfilled" &&
    statusResult.status === "fulfilled" &&
    !servicesResult.value.stale &&
    !statusResult.value.stale
      ? "ok"
      : "unavailable";
  return NextResponse.json(
    {
      status: "ok",
      version: process.env.BUILD_VERSION ?? process.env.npm_package_version ?? "unknown",
      firestore: store,
      vpnApi: api,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
