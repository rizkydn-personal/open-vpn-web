import { describe, expect, test } from "vitest";
import { memoryStore } from "../src/lib/store/memoryStore";

describe("memoryStore", () => {
  test("reserve, release, and snapshot", async () => {
    const now = new Date("2026-10-07T10:00:00Z"); // fixed time
    const service = "ssh";
    const limit = 2;

    // Reserve 1
    const res1 = await memoryStore.reserve(service, now, limit);
    expect(res1.ok).toBe(true);

    // Reserve 2
    const res2 = await memoryStore.reserve(service, now, limit);
    expect(res2.ok).toBe(true);

    // Reserve 3 (should fail)
    const res3 = await memoryStore.reserve(service, now, limit);
    expect(res3.ok).toBe(false);
    if (!res3.ok) {
      expect(res3.used).toBe(2);
    }

    // Snapshot
    const snap = await memoryStore.snapshot([{ id: service }, { id: "other" }], now, limit);
    expect(snap[service].used).toBe(2);
    expect(snap[service].remaining).toBe(0);
    expect(snap["other"].used).toBe(0);
    expect(snap["other"].remaining).toBe(2);

    // Release 1
    await memoryStore.release(service, res1.ok ? res1.day : "");
    const snap2 = await memoryStore.snapshot([{ id: service }], now, limit);
    expect(snap2[service].used).toBe(1);
    expect(snap2[service].remaining).toBe(1);
  });

  test("reserveIp", async () => {
    const now = new Date("2026-10-07T10:00:00Z");
    const ipHash = "hash1";
    const limit = 1;

    const res1 = await memoryStore.reserveIp(ipHash, "ssh", now, limit);
    expect(res1.ok).toBe(true);

    const res2 = await memoryStore.reserveIp(ipHash, "ssh", now, limit);
    expect(res2.ok).toBe(false);
  });
});
