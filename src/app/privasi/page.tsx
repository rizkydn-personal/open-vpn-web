export const metadata = { title: "Privasi" };
export default function Privasi() {
  return (
    <article className="panel legal">
      <h1>Kebijakan privasi</h1>
      <p>Terakhir diperbarui: 8 Oktober 2026.</p>
      <p>
        Aplikasi web tidak menyimpan kredensial hasil di database atau log. Untuk pembatasan
        percobaan, log dapat memuat waktu, layanan, durasi, hash IP bersalt, dan hasil permintaan.
        Counter pembatasan IP memakai hash dan dihapus sesuai masa berlaku.
      </p>
      <p>
        Jika diaktifkan, Cloudflare Turnstile memproses verifikasi keamanan. Salinan sementara
        detail akun disimpan di sessionStorage pada tab Anda paling lama 30 menit atau sampai hasil
        ditutup.
      </p>
    </article>
  );
}
