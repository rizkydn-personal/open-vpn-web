import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VPN Gratis | Portal Akun VPN", template: "%s | VPN Gratis" },
  description:
    "Buat akun VPN gratis dengan kuota harian. Detail koneksi ditampilkan sekali dan tidak disimpan di server.",
  openGraph: {
    title: "VPN Gratis | Portal Akun VPN",
    description: "Buat akun VPN gratis dengan kuota harian.",
  },
};
export const viewport: Viewport = { themeColor: "#035AA6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#main-content">
          Lewati ke konten
        </a>
        <Navbar />
        <main id="main-content" className="page-shell">
          {children}
        </main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>
              © {new Date().getFullYear()} VPN Gratis. Gunakan layanan dengan bertanggung jawab.
            </p>
            <nav aria-label="Tautan footer">
              <Link href="/ketentuan">Ketentuan</Link> · <Link href="/privasi">Privasi</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
