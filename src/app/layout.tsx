import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPN Gratis | Portal Akun",
  description: "Portal sederhana untuk membuat akun VPN gratis.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#main-content">Lewati ke konten</a>
        <Navbar />
        <main id="main-content" className="page-shell">{children}</main>
        <footer className="site-footer">
          <div className="site-footer__inner">
            <p>VPN Gratis | Gunakan layanan dengan bertanggung jawab.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
