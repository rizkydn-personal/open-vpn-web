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
  "Portal untuk membuat akun VPN gratis. Pilih server dan service, lalu simpan connection details.";
export const metadata: Metadata = {
  title: { default: "Free VPN | Portal Akun VPN", template: "%s | Free VPN" },
  description,
  ...(process.env.SITE_URL && /^https?:\/\//.test(process.env.SITE_URL)
    ? { metadataBase: new URL(process.env.SITE_URL) }
    : {}),
  openGraph: { title: "Free VPN | Portal Akun VPN", description },
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
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" className="page-shell">
          {children}
        </main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>
              © {new Date().getFullYear()} QubanTra. Gunakan service dengan
              bertanggung jawab.
            </p>
            <nav aria-label="Footer links">
              <Link href="/ketentuan">Terms</Link>
              <Link href="/privasi">Privacy</Link>
              {supportUrl ? (
                <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                  Support <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
