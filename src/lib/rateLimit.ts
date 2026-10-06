import "server-only";
import { createHash } from "node:crypto";
import type { AppEnv } from "@/lib/env";
import { reserveIpQuota, finishIpQuota } from "@/lib/firestore";
export type IpReservation = { ok: true; logId: string } | { ok: false; used: number };

export function clientIpHash(headers: Headers, env: AppEnv): string {
  let address: string | null = null;
  if (env.TRUST_PROXY_HEADERS) {
    address = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } else {
    // A reverse proxy should overwrite X-Real-IP with the socket peer address.
    // X-Forwarded-For is intentionally ignored unless explicitly trusted.
    address = headers.get("x-real-ip")?.trim() ?? null;
  }
  const normalized = address && address.length <= 128
    ? address
    : process.env.NODE_ENV === "development"
      ? `dev:${headers.get("user-agent")?.slice(0, 128) ?? "unknown"}`
      : "unknown";
  return createHash("sha256").update(`${env.IP_HASH_SALT}:${normalized}`).digest("hex");
}

export function reserveCreateAttempt(headers: Headers, service: string, now: Date, env: AppEnv): Promise<IpReservation | { ok: true; logId: string }> {
  return reserveIpQuota(clientIpHash(headers, env), service, now, env.PER_IP_CREATE_LIMIT_PER_HOUR);
}

export function finishCreateAttempt(logId: number | string, outcome: "ok" | "fail" | "unknown"): Promise<void> {
  return finishIpQuota(logId, outcome);
}

export async function verifyTurnstile(token: string | null, remoteIp: string | null, env: AppEnv): Promise<boolean> {
  if (!env.TURNSTILE_SITE_KEY && !env.TURNSTILE_SECRET_KEY) return true;
  if (!token || !env.TURNSTILE_SECRET_KEY) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body, signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return Boolean(result && typeof result === "object" && "success" in result && result.success === true);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
