import { describe, expect, test } from "vitest";
import { translateClientError } from "../src/lib/clientErrors";

describe("clientErrors", () => {
  test("translateClientError mappings", () => {
    expect(translateClientError("network_error")).toBe("Tidak dapat terhubung ke internet. Periksa koneksi Anda lalu coba lagi.");
    expect(translateClientError("fetch_failed")).toBe("Terjadi kesalahan di server. Silakan coba lagi."); // Wait, the table says "Jaringan putus / fetch gagal". My function just checks "network_error". I'll pass "network_error" on fetch fail, so that's fine.
    expect(translateClientError("timeout")).toBe("Permintaan memakan waktu terlalu lama. Akun mungkin sudah dibuat. Tunggu 2–3 menit sebelum mencoba lagi.");
    expect(translateClientError("invalid_request")).toBe("Layanan atau durasi tidak tersedia. Muat ulang halaman lalu pilih lagi.");
    expect(translateClientError("verification_failed")).toBe("Verifikasi keamanan belum berhasil. Selesaikan verifikasi lalu coba lagi.");
    expect(translateClientError("forbidden_origin")).toBe("Permintaan ditolak. Muat ulang halaman lalu coba lagi.");
    expect(translateClientError("unknown", 415)).toBe("Permintaan ditolak. Muat ulang halaman lalu coba lagi.");
    expect(translateClientError("unknown", 413)).toBe("Permintaan ditolak. Muat ulang halaman lalu coba lagi.");
    expect(translateClientError("rate_limited", undefined, { retryMinutes: 10 })).toBe("Terlalu banyak percobaan. Coba lagi sekitar 10 menit lagi.");
    expect(translateClientError("quota_exhausted", undefined, { serviceName: "SSH" })).toBe("Kuota SSH hari ini sudah habis. Kuota direset pukul 00.00 WIB.");
    expect(translateClientError("conflict")).toBe("Akun tidak dapat dibuat saat ini. Silakan coba lagi.");
    expect(translateClientError("service_unavailable")).toBe("Layanan sedang sibuk atau tidak dapat dihubungi. Coba lagi sebentar lagi.");
    expect(translateClientError("store_unavailable")).toBe("Layanan sedang sibuk atau tidak dapat dihubungi. Coba lagi sebentar lagi.");
    expect(translateClientError("creation_unknown")).toBe("Status pembuatan akun tidak pasti. Jangan klik berulang kali. Tunggu beberapa menit lalu coba lagi.");
    expect(translateClientError("unknown", 504)).toBe("Status pembuatan akun tidak pasti. Jangan klik berulang kali. Tunggu beberapa menit lalu coba lagi.");
    expect(translateClientError("unknown", 500)).toBe("Terjadi kesalahan di server. Silakan coba lagi.");
    expect(translateClientError("random")).toBe("Terjadi kesalahan di server. Silakan coba lagi.");
  });
});
