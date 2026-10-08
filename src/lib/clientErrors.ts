export function clientErrorMessage(
  status?: number,
  code?: string,
  retryAfter?: string | null,
): string {
  if (code === "invalid_request")
    return "Layanan atau durasi tidak tersedia. Muat ulang halaman lalu pilih lagi.";
  if (code === "verification_failed")
    return "Verifikasi keamanan belum berhasil. Selesaikan verifikasi lalu coba lagi.";
  if (code === "forbidden_origin" || status === 415 || status === 413)
    return "Permintaan ditolak. Muat ulang halaman lalu coba lagi.";
  if (code === "rate_limited")
    return `Terlalu banyak percobaan. Coba lagi sekitar ${Math.max(1, Math.ceil(Number(retryAfter ?? 60) / 60))} menit.`;
  if (code === "quota_exhausted")
    return "Kuota layanan hari ini sudah habis. Kuota direset pukul 00.00 WIB.";
  if (code === "conflict") return "Akun tidak dapat dibuat saat ini. Silakan coba lagi.";
  if (code === "service_unavailable" || code === "store_unavailable")
    return "Layanan sedang sibuk atau tidak dapat dihubungi. Coba lagi sebentar lagi.";
  if (code === "creation_unknown")
    return "Status pembuatan akun tidak pasti. Jangan klik berulang kali. Tunggu beberapa menit lalu coba lagi.";
  if (code === "network")
    return "Tidak dapat terhubung ke internet. Periksa koneksi Anda lalu coba lagi.";
  if (code === "timeout")
    return "Permintaan memakan waktu terlalu lama. Akun mungkin sudah dibuat. Tunggu 2–3 menit sebelum mencoba lagi.";
  return "Terjadi kesalahan di server. Silakan coba lagi.";
}
