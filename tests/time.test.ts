import { describe, expect, it } from "vitest";
import { formatWib, nextResetAt, wibDay } from "@/lib/time";

describe("Jakarta time calculations", () => {
  it("uses the WIB day close to midnight without depending on host timezone", () => {
    expect(wibDay(new Date("2026-10-06T16:59:59.000Z"))).toBe("2026-10-06");
    expect(wibDay(new Date("2026-10-06T17:00:00.000Z"))).toBe("2026-10-07");
  });
  it("resets at 00:00 WIB", () => {
    expect(nextResetAt(new Date("2026-10-06T16:59:59.000Z")).toISOString()).toBe("2026-10-06T17:00:00.000Z");
    expect(nextResetAt(new Date("2026-10-06T17:00:00.000Z")).toISOString()).toBe("2026-10-07T17:00:00.000Z");
  });
  it("formats human-readable Indonesian time in WIB", () => {
    expect(formatWib("2026-10-06T17:10:00.000Z")).toContain("07 Okt 2026, 00.10 WIB");
  });
});
