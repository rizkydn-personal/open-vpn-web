import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createAccount,
  getServices,
  getStatus,
  resetVpnApiCacheForTests,
} from "@/lib/vpnApi";

const originalFetch = globalThis.fetch;
process.env.IP_HASH_SALT = "test-only-salt-16";
afterEach(() => {
  globalThis.fetch = originalFetch;
  resetVpnApiCacheForTests();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("VPN API client", () => {
  it("parses services loosely and sends the API key only from the server", async () => {
    process.env.VPN_API_BASE_URL = "http://127.0.0.1:8089";
    process.env.VPN_API_KEY = "test-secret";
    globalThis.fetch = vi.fn(async (_input, init) => {
      expect(new Headers(init?.headers).get("X-API-Key")).toBe("test-secret");
      return jsonResponse({
        data: { services: [{ id: "new", label: "New", available: true, extra: "ignored" }] },
        future_field: 1,
      });
    }) as typeof fetch;
    await expect(getServices()).resolves.toMatchObject({
      stale: false,
      value: [{ id: "new", label: "New", available: true }],
    });
  });

  it("parses status fields used by the dashboard", async () => {
    process.env.VPN_API_BASE_URL = "http://127.0.0.1:8089";
    process.env.VPN_API_KEY = "test-secret";
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ data: { accounts: { ssh: 4 }, online: { xray: null }, ignored: true } }),
    ) as typeof fetch;
    await expect(getStatus()).resolves.toMatchObject({
      value: { accounts: { ssh: 4 }, online: { xray: null } },
    });
  });

  it("posts creation with its idempotency key", async () => {
    process.env.VPN_API_BASE_URL = "http://127.0.0.1:8089";
    process.env.VPN_API_KEY = "test-secret";
    globalThis.fetch = vi.fn(async (_input, init) => {
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("request-1");
      expect(JSON.parse(String(init?.body))).toEqual({
        service: "ssh",
        days: 3,
        username: "wabcdefg",
      });
      return jsonResponse(
        {
          data: {
            username: "wabcdefg",
            expires_at: "2026-10-09T00:00:00Z",
            connection: { host: "mock.local" },
          },
        },
        201,
      );
    }) as typeof fetch;
    await expect(
      createAccount({ service: "ssh", days: 3, username: "wabcdefg" }, "request-1"),
    ).resolves.toMatchObject({ username: "wabcdefg", connection: { host: "mock.local" } });
  });

  it("maps 401 and 409 without leaking the upstream message", async () => {
    process.env.VPN_API_BASE_URL = "http://127.0.0.1:8089";
    process.env.VPN_API_KEY = "test-secret";
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ error: { code: "conflict", message: "private upstream detail" } }, 409),
    ) as typeof fetch;
    await expect(
      createAccount({ service: "ssh", days: 1, username: "wabcdefg" }, "request-2"),
    ).rejects.toMatchObject({ code: "conflict", status: 409, retryable: false });
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ error: { code: "unauthorized" } }, 401),
    ) as typeof fetch;
    await expect(
      createAccount({ service: "ssh", days: 1, username: "wabcdefg" }, "request-3"),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("marks an aborted POST timeout as uncertain and retryable", async () => {
    process.env.VPN_API_BASE_URL = "http://127.0.0.1:8089";
    process.env.VPN_API_KEY = "test-secret";
    process.env.VPN_API_POST_TIMEOUT_MS = "10";
    globalThis.fetch = vi.fn(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    ) as typeof fetch;
    await expect(
      createAccount({ service: "ssh", days: 1, username: "wabcdefg" }, "request-4"),
    ).rejects.toMatchObject({
      code: "upstream_timeout",
      status: 504,
      retryable: true,
      uncertain: true,
    });
    delete process.env.VPN_API_POST_TIMEOUT_MS;
  });
});
