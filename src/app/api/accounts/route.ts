import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { releaseQuota, reserveQuota } from "@/lib/firestore";
import { guardAccountRequest, isPayloadTooLarge } from "@/lib/requestGuard";
import { clientIpHash, reserveCreateAttempt, verifyTurnstile } from "@/lib/rateLimit";
import { nextResetAt } from "@/lib/time";
import { ApiError, createAccount, getServices } from "@/lib/vpnApi";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ service: z.string().min(1).max(80), days: z.number().int() }).strict();
const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
const error = (status: number, code: string, message = "Permintaan tidak dapat diproses.", headers?: HeadersInit) => NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });
const username = () => `w${Array.from(randomBytes(7), (value) => alphabet[value & 31]).join("")}`;
const logCreate = (service: string, days: number, ipHash: string, outcome: string) => console.log(JSON.stringify({ ts: new Date().toISOString(), service, days, ip_hash: ipHash, outcome }));

export async function POST(request: Request) {
  try {
    const guard = guardAccountRequest(request); if (guard) return error(guard.status, guard.code);
    const text = await request.text(); if (isPayloadTooLarge(text)) return error(413, "payload_too_large");
    let raw: unknown; try { raw = JSON.parse(text); } catch { return error(422, "invalid_request"); }
    const parsed = bodySchema.safeParse(raw); if (!parsed.success) return error(422, "invalid_request", "Layanan atau durasi tidak valid.");
    const env = getEnv();
    let catalog; try { catalog = await getServices(); } catch { return error(503, "service_unavailable"); }
    const service = catalog.value.find((item) => item.id === parsed.data.service);
    if (!service || !service.available || !env.ALLOWED_DAYS.includes(parsed.data.days as 1 | 3 | 7) || (service.max_days !== undefined && parsed.data.days > service.max_days)) return error(422, "invalid_request", "Layanan atau durasi tidak tersedia.");
    const forwarded = env.TRUST_PROXY_HEADERS ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null : request.headers.get("x-real-ip")?.trim() ?? null;
    if (!await verifyTurnstile(request.headers.get("cf-turnstile-response"), forwarded, env)) return error(422, "verification_failed");
    const now = new Date(); const attempt = await reserveCreateAttempt(request.headers, service.id, now, env);
    if (!attempt.ok) return error(429, "rate_limited", "Terlalu banyak percobaan.", { "Retry-After": String(attempt.retryAfter) });
    const reservation = await reserveQuota(service.id, now, env.DAILY_LIMIT_PER_SERVICE);
    if (!reservation.ok) { logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "quota_exhausted"); return NextResponse.json({ error: { code: "quota_exhausted", message: "Kuota layanan hari ini habis." }, data: { used: reservation.used, limit: env.DAILY_LIMIT_PER_SERVICE, resetsAt: nextResetAt(now).toISOString() } }, { status: 409, headers: { "Cache-Control": "no-store" } }); }
    try {
      const result = await createAccount({ service: service.id, days: parsed.data.days, username: username() }, randomUUID());
      logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "ok"); return NextResponse.json({ data: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (cause) {
      if (cause instanceof ApiError && cause.uncertain) { logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "unknown"); return error(504, "creation_unknown"); }
      await releaseQuota(service.id, reservation.day); logCreate(service.id, parsed.data.days, clientIpHash(request.headers, env), "fail");
      if (cause instanceof ApiError && cause.status === 409) return error(409, "conflict");
      if (cause instanceof ApiError && cause.status === 422) return error(422, "invalid_request");
      return error(503, "service_unavailable");
    }
  } catch (cause) {
    if (cause instanceof Error && /Firestore|Store|store/i.test(cause.message)) return error(503, "store_unavailable");
    console.error(JSON.stringify({ event: "account_create_failed", error: "internal_error" })); return error(500, "internal_error");
  }
}
