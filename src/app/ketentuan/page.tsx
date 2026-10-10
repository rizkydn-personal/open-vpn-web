export const metadata = { title: "Ketentuan" };
export default function Ketentuan() {
  return (
    <article className="panel legal" style={{ borderRadius: "var(--radius-lg)" }}>
      <h1 style={{ fontFamily: "var(--font-sans)" }}>Ketentuan layanan</h1>
      <p>Terakhir diperbarui: 8 Oktober 2026.</p>
      <p>
        Layanan ini disediakan gratis apa adanya tanpa jaminan ketersediaan atau kesesuaian untuk
        tujuan tertentu.
      </p>
      <p>
        Dilarang menggunakan layanan untuk spam, serangan, pelanggaran hukum, atau penyalahgunaan
        lainnya. Akun dapat dibatasi atau dicabut dan kuota harian berlaku untuk setiap layanan.
      </p>
      <p>Anda bertanggung jawab atas penggunaan akun dan koneksi yang dibuat melalui portal ini.</p>
    </article>
  );
}
