import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { AppEnv } from "@/lib/env";
import { reserveIpQuota } from "@/lib/store";
import { wibDay, nextResetAt } from "@/lib/time";
export type IpReservation = { ok: true; logId: string } | { ok: false; used: number; retryAfter: number };

let lastMissingLog = 0;

export function clientIpHash(headers: Headers, env: AppEnv): string {
  let address: string | null = null;
  if (env.TRUST_PROXY_HEADERS) {
    address = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } else {
    address = headers.get("x-real-ip")?.trim() ?? null;
  }

  // Normalize IPv6 or extract IPv4
  let normalized = "unknown";
  if (address) {
    let rawIp = address;
    if (rawIp.includes("]:")) rawIp = rawIp.slice(0, rawIp.lastIndexOf("]:") + 1);
    else if (!rawIp.includes("]") && rawIp.includes(":")) {
      const parts = rawIp.split(":");
      if (parts.length === 2) rawIp = parts[0];
    }
    rawIp = rawIp.replace(/\[|\]/g, ""); // remove brackets
    
    if (isIP(rawIp) === 4) {
      normalized = rawIp;
    } else if (isIP(rawIp) === 6) {
      const parts = rawIp.split(":");
      normalized = parts.slice(0, 4).join(":");
    }
  }

  if (normalized === "unknown" && process.env.NODE_ENV === "production") {
    const now = Date.now();
    if (now - lastMissingLog > 60000) {
      console.log(JSON.stringify({ event: "ip_missing", headers: Object.fromEntries(headers.entries()) }));
      lastMissingLog = now;
    }
    normalized = "shared_missing_ip";
  } else if (normalized === "unknown") {
    normalized = `dev:${headers.get("user-agent")?.slice(0, 128) ?? "unknown"}`;
  }

  return createHash("sha256").update(`${env.IP_HASH_SALT}:${normalized}`).digest("hex");
}

export async function reserveCreateAttempt(headers: Headers, service: string, now: Date, env: AppEnv): Promise<IpReservation> {
  const ipHash = clientIpHash(headers, env);
  
  const hourly = await reserveIpQuota(ipHash, "hourly", now, env.PER_IP_CREATE_LIMIT_PER_HOUR);
  if (!hourly.ok) {
    const nextHour = (Math.floor(now.getTime() / 3600000) + 1) * 3600000;
    return { ...hourly, retryAfter: Math.ceil((nextHour - now.getTime()) / 1000) };
  }
  
  const daily = await reserveIpQuota(ipHash, service, now, env.PER_IP_CREATE_LIMIT_PER_DAY);
  if (!daily.ok) {
    const resetsAt = nextResetAt(now).getTime();
    return { ...daily, retryAfter: Math.ceil((resetsAt - now.getTime()) / 1000) };
  }
  
  return { ok: true, logId: daily.logId };
}

export function finishCreateAttempt(logId: number | string, outcome: "ok" | "fail" | "unknown"): Promise<void> {
  return Promise.resolve();
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
