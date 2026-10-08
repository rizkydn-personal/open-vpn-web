import "server-only";
import { z } from "zod";
import { getApiServers, getEnv, resetEnvForTests } from "@/lib/env";

const serviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/),
  label: z.string(),
  available: z.boolean(),
  reason: z.string().nullable().optional(),
  max_days: z.number().int().positive().optional(),
});
const servicesEnvelopeSchema = z.object({ data: z.object({ services: z.array(serviceSchema) }) });
const statusEnvelopeSchema = z.object({
  data: z.object({
    server: z.record(z.string(), z.unknown()).optional(),
    services: z.record(z.string(), z.unknown()).optional(),
    accounts: z.record(z.string(), z.number()).optional(),
    online: z.record(z.string(), z.number().nullable()).optional(),
  }),
});
const createEnvelopeSchema = z.object({
  data: z.object({
    username: z.string(),
    expires_at: z.string(),
    connection: z.record(z.string(), z.unknown()).optional().default({}),
  }),
});

export type Service = z.infer<typeof serviceSchema>;
export type ServerStatus = z.infer<typeof statusEnvelopeSchema>["data"];
export type ConnectionData = Record<string, unknown>;
export type CreatedAccount = {
  username: string;
  expires_at: string;
  connection: ConnectionData;
};
export type CachedResult<T> = { value: T; stale: boolean };

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly uncertain: boolean;

  constructor(code: string, status: number, retryable: boolean, uncertain = false) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.uncertain = uncertain;
  }
}

type CacheEntry<T> = { value: T; savedAt: number; refresh?: Promise<T> };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 10_000;
const STALE_LIMIT_MS = 5 * 60_000;

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  timeoutMs: number,
  init?: RequestInit,
): Promise<T> {
  const env = getEnv();
  let last: unknown;
  let timedOut = false;
  const isPost = init?.method === "POST";
  for (const server of getApiServers(env)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetch(`${server.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "X-API-Key": server.apiKey,
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
        cache: "no-store",
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiError("invalid_response", 502, false);
      }
      if (!response.ok) {
        const envelope = z
          .object({
            error: z
              .object({ code: z.string().optional(), message: z.string().optional() })
              .optional(),
          })
          .safeParse(payload);
        const code = envelope.success
          ? (envelope.data.error?.code ?? `upstream_${response.status}`)
          : `upstream_${response.status}`;
        throw new ApiError(code, response.status, response.status >= 500, false);
      }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) throw new ApiError("invalid_response", 502, false);
      return parsed.data;
    } catch (error) {
      last = error;
      if (error instanceof ApiError && !error.retryable) throw error;
      // A POST that timed out or reached an upstream server may already have created an account.
      if (isPost && (timedOut || error instanceof ApiError)) break;
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }
  if (last) {
    const error = last;
    if (error instanceof ApiError) throw error;
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      throw new ApiError("upstream_timeout", 504, true, true);
    }
    throw new ApiError("upstream_unavailable", 503, true, true);
  }
  throw new ApiError("upstream_unavailable", 503, true, true);
}

async function cached<T>(
  key: string,
  load: () => Promise<T>,
  now = Date.now(),
): Promise<CachedResult<T>> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && now - entry.savedAt < CACHE_TTL_MS) return { value: entry.value, stale: false };
  if (entry && now - entry.savedAt < STALE_LIMIT_MS) {
    if (!entry.refresh) {
      entry.refresh = load()
        .then((value) => {
          cache.set(key, { value, savedAt: Date.now() });
          return value;
        })
        .catch(() => entry.value)
        .finally(() => {
          const current = cache.get(key) as CacheEntry<T> | undefined;
          if (current) delete current.refresh;
        });
    }
    return { value: entry.value, stale: true };
  }
  const value = await load();
  cache.set(key, { value, savedAt: Date.now() });
  return { value, stale: false };
}

export function getServices(): Promise<CachedResult<Service[]>> {
  const env = getEnv();
  return cached(
    "services",
    async () =>
      (await request("/v1/services", servicesEnvelopeSchema, env.VPN_API_GET_TIMEOUT_MS)).data
        .services,
  );
}

export function getStatus(): Promise<CachedResult<ServerStatus>> {
  const env = getEnv();
  return cached(
    "status",
    async () =>
      (await request("/v1/status", statusEnvelopeSchema, env.VPN_API_GET_TIMEOUT_MS)).data,
  );
}

export async function createAccount(
  input: { service: string; days: number; username: string },
  idempotencyKey: string,
): Promise<CreatedAccount> {
  const env = getEnv();
  return (
    await request("/v1/accounts", createEnvelopeSchema, env.VPN_API_POST_TIMEOUT_MS, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(input),
    })
  ).data;
}

export function resetVpnApiCacheForTests(): void {
  cache.clear();
  resetEnvForTests();
}
