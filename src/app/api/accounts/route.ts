import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { ApiError, createAccount, getServices } from "@/lib/vpnApi";
import { clientIpHash, reserveCreateAttempt, verifyTurnstile } from "@/lib/rateLimit";
import { checkRequestGuard } from "@/lib/requestGuard";
import { releaseQuota, reserveQuota } from "@/lib/store";
import { nextResetAt } from "@/lib/time";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ service: z.string().min(1).max(80), days: z.number().int() }).strict();
const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
function randomUsername(): string {
  const bytes = randomBytes(7);
  return `w${Array.from(bytes, (value) => alphabet[value & 31]).join("")}`;
}
function error(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function logCreate(service: string, days: number, ipHash: string, outcome: string): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), service, days, ip_hash: ipHash, outcome }));
}

async function handlePost(request: Request) {
  const env = getEnv();
  const guard = await checkRequestGuard(request);
  if (!guard.ok) return error(guard.status, guard.code, guard.message);
  
  let rawText = "";
  let raw: unknown;
  try { 
    rawText = await request.text(); 
    if (rawText.length > 2048) {
       return error(413, "payload_too_large", "Payload too large");
    }
    raw = JSON.parse(rawText);
  }
  catch { return error(422, "invalid_request", "Permintaan tidak valid."); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return error(422, "invalid_request", "Layanan atau durasi tidak valid.");

  let catalog;
  try { catalog = await getServices(); }
  catch { return error(503, "service_unavailable", "Server sedang tidak dapat dihubungi."); }
  
  const service = catalog.value.find((item) => item.id === parsed.data.service);
  if (!service || !service.available || !env.ALLOWED_DAYS.includes(parsed.data.days as 1 | 3 | 7)
      || (service.max_days !== undefined && parsed.data.days > service.max_days)) {
    return error(422, "invalid_request", "Layanan atau durasi tidak tersedia.");
  }

  const forwarded = env.TRUST_PROXY_HEADERS ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
    : request.headers.get("x-real-ip")?.trim() ?? null;
  if (!await verifyTurnstile(request.headers.get("cf-turnstile-response"), forwarded, env)) {
    return error(422, "verification_failed", "Verifikasi keamanan belum berhasil.");
  }

  const now = new Date();
  const attempt = await reserveCreateAttempt(request.headers, service.id, now, env);
  if (!attempt.ok) return error(429, "rate_limited", "Batas pembuatan akun sementara tercapai. Coba lagi nanti.", { "Retry-After": String(attempt.retryAfter) });
  const reservation = await reserveQuota(service.id, now, env.DAILY_LIMIT_PER_SERVICE);
  if (!reservation.ok) {
    const ipHash=clientIpHash(request.headers, env);
    logCreate(service.id, parsed.data.days, ipHash, "quota_exhausted");
    return NextResponse.json({ error: { code: "quota_exhausted", message: "Kuota layanan hari ini habis." }, data: { used: reservation.used, limit: env.DAILY_LIMIT_PER_SERVICE, resetsAt: nextResetAt(now).toISOString() } }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  const username = randomUsername();
  const idempotencyKey = randomUUID();
  let result;
  try {
    try {
      result = await createAccount({ service: service.id, days: parsed.data.days, username }, idempotencyKey);
    } catch (first) {
      if (!(first instanceof ApiError) || !first.retryable) throw first;
      result = await createAccount({ service: service.id, days: parsed.data.days, username }, idempotencyKey);
    }
    logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "ok");
    return NextResponse.json({ data: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error(JSON.stringify({ event: "account_create_failed", error: cause instanceof Error ? cause.message : String(cause) }));
    if (cause instanceof ApiError && cause.uncertain) {
      logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "unknown");
      return error(504, "creation_unknown", "Status pembuatan tidak pasti, coba lagi beberapa menit.");
    }
    await releaseQuota(service.id, reservation.day);
    logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "fail");
    if (cause instanceof ApiError && cause.status === 409) return error(409, "conflict", "Akun tidak dapat dibuat. Coba kembali.");
    if (cause instanceof ApiError && cause.status === 422) return error(422, "invalid_request", "Layanan atau durasi tidak tersedia.");
    return error(503, "service_unavailable", "Server sedang tidak dapat membuat akun. Kuota telah dikembalikan.");
  }
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err: any) {
    console.error("POST handler error:", err);
    if (err.message && err.message.includes("Firestore is not configured")) {
      return error(503, "store_unavailable", "Layanan sementara tidak tersedia (store error).");
    }
    // Also catch network errors to firestore or other unhandled exceptions
    if (err.code === "UNAVAILABLE" || err.message?.includes("store")) {
      return error(503, "store_unavailable", "Layanan sementara tidak tersedia (store error).");
    }
    return error(500, "internal_error", "Terjadi kesalahan sistem internal.");
  }
}
