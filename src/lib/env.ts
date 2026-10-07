import "server-only";
import { z } from "zod";

const envSchema = z.object({
  VPN_API_BASE_URL: z.string().default("").refine(val => !val || val.startsWith("https://") || /^(http:\/\/)(127\.0\.0\.1|localhost|\[::1\])/.test(val), { message: "VPN_API_BASE_URL must be https or loopback" }),
  VPN_API_KEY: z.string().trim().default(""),
  VPN_API_SERVERS: z.string().optional().default(""),
  DAILY_LIMIT_PER_SERVICE: z.coerce.number().int().min(1).default(10),
  ALLOWED_DAYS: z.string().default("1,3,7").transform((value) => value.split(",").map((item) => Number(item.trim())))
    .pipe(z.array(z.union([z.literal(1), z.literal(3), z.literal(7)])).min(1))
    .transform((value) => value as Array<1 | 3 | 7>),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),
  PER_IP_CREATE_LIMIT_PER_HOUR: z.coerce.number().int().min(1).default(5),
  PER_IP_CREATE_LIMIT_PER_DAY: z.coerce.number().int().min(1).default(3),
  IP_HASH_SALT: z.string().min(16),
  TRUST_PROXY_HEADERS: z.enum(["0", "1"]).default("0").transform((value) => value === "1"),
  SUPPORT_URL: z.string().default("").transform(val => {
    if (!val) return "";
    try {
      const url = new URL(val);
      if (url.protocol === "http:" || url.protocol === "https:") return val;
      console.warn("SUPPORT_URL ignored: invalid protocol");
      return "";
    } catch {
      console.warn("SUPPORT_URL ignored: invalid URL");
      return "";
    }
  }),
  TURNSTILE_SITE_KEY: z.string().default(""),
  TURNSTILE_SECRET_KEY: z.string().default(""),
  VPN_API_GET_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  VPN_API_POST_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  QUOTA_STORE: z.enum(["firestore", "memory"]).optional(),
}).refine((value) => Boolean(value.TURNSTILE_SITE_KEY) === Boolean(value.TURNSTILE_SECRET_KEY), { message: "Turnstile site and secret keys must be configured together" });

export type AppEnv = z.infer<typeof envSchema>;
export type ApiServer = { id: string; baseUrl: string; apiKey: string; label?: string };

export function getApiServers(env: AppEnv = getEnv()): ApiServer[] {
  const raw = env.VPN_API_SERVERS.trim();
  if (!raw) {
    if (!env.VPN_API_BASE_URL || !env.VPN_API_KEY) throw new Error("VPN_API_BASE_URL and VPN_API_KEY are required");
    return [{ id: "default", baseUrl: env.VPN_API_BASE_URL.replace(/\/+$/, ""), apiKey: env.VPN_API_KEY }];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("must be an array");
    const servers = parsed.map((item, index) => {
      if (!item || typeof item !== "object") throw new Error(`server ${index + 1} invalid`);
      const value = item as Record<string, unknown>;
      const baseUrl = typeof value.baseUrl === "string" ? value.baseUrl.replace(/\/+$/, "") : "";
      const apiKey = typeof value.apiKey === "string" ? value.apiKey.trim() : "";
      if (!baseUrl || !apiKey || (!baseUrl.startsWith("https://") && !/^(http:\/\/)(127\.0\.0\.1|localhost|\[::1\])/.test(baseUrl))) {
        throw new Error(`server ${index + 1} invalid URL`);
      }
      return { id: typeof value.id === "string" && value.id ? value.id : `server-${index + 1}`, baseUrl, apiKey, label: typeof value.label === "string" ? value.label : undefined };
    });
    if (!servers.length) throw new Error("no servers configured");
    return servers;
  } catch (error) { throw new Error(`VPN_API_SERVERS invalid: ${error instanceof Error ? error.message : "invalid JSON"}`); }
}

let memoizedEnv: AppEnv | null = null;
export function getEnv(): AppEnv {
  if (memoizedEnv) return memoizedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Server configuration is invalid: ${missing}`);
  }
  memoizedEnv = parsed.data;
  return memoizedEnv;
}
