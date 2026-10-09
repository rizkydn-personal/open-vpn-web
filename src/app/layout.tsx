import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { getEnv } from "@/lib/env";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

const description =
  "Portal untuk membuat akun VPN. Detail koneksi tersedia sementara di tab browser agar dapat disalin atau diunduh.";
export const metadata: Metadata = {
  title: { default: "VPN Gratis | Portal Akun VPN", template: "%s | VPN Gratis" },
  description,
  ...(process.env.SITE_URL && /^https?:\/\//.test(process.env.SITE_URL)
    ? { metadataBase: new URL(process.env.SITE_URL) }
    : {}),
  openGraph: { title: "VPN Gratis | Portal Akun VPN", description },
};
export const viewport: Viewport = { themeColor: "#0866b5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Defensif saat build/prerender tanpa env lengkap: footer dukungan disembunyikan.
  let supportUrl: string | undefined;
  try {
    supportUrl = getEnv().SUPPORT_URL || undefined;
  } catch {
    supportUrl = undefined;
  }
  return (
    <html lang="id" className={jakarta.variable}>
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
              © {new Date().getFullYear()} VPN Gratis · rnpproject. Gunakan layanan dengan
              bertanggung jawab.
            </p>
            <nav aria-label="Tautan footer">
              <Link href="/ketentuan">Ketentuan</Link>
              <Link href="/privasi">Privasi</Link>
              {supportUrl ? (
                <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                  Dukungan <span className="sr-only">(membuka tab baru)</span>
                </a>
              ) : null}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
