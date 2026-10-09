import Link from "next/link";
import { NotFoundServices } from "@/components/NotFoundServices";

export default function NotFound() {
  return (
    <section className="recovery-page not-found-page" aria-labelledby="not-found-title">
      <svg
        className="broken-path"
        viewBox="0 0 320 64"
        role="img"
        aria-label="Jalur koneksi terputus"
      >
        <circle cx="22" cy="32" r="8" />
        <path d="M30 32h92m18 0h112" />
        <circle cx="270" cy="32" r="8" />
        <circle cx="131" cy="32" r="5" />
      </svg>
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">Halaman ini tidak ada di portal.</h1>
      <p>Alamatnya mungkin berubah atau tautannya sudah tidak berlaku.</p>
      <Link
        className="button-primary recovery-home"
        href="/"
        style={{ borderRadius: "var(--radius-pill)" }}
      >
        Kembali ke beranda
      </Link>
      <NotFoundServices />
    </section>
  );
}
