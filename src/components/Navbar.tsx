import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getServices } from "@/lib/vpnApi";
import type { Service } from "@/lib/vpnApi";
import { ServiceMenu } from "@/components/ServiceMenu";
import { NavLinks } from "@/components/NavLinks";
import { groupServicesByServer } from "@/lib/serverDirectory";

export async function Navbar() {
  let services: Service[] = [];
  try {
    services = (await getServices()).value;
  } catch {
    /* Show home only until service catalog is available. */
  }
  const servers = groupServicesByServer(services).map(({ id, label }) => ({ id, label }));
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="VPN Gratis, beranda">
          <span className="brand__mark">
            <ShieldCheck size={21} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span>
            <span className="brand__name">VPN Gratis</span>
            <span className="brand__caption">Portal akun VPN</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <NavLinks servers={servers} services={services} />
        </nav>
        <ServiceMenu servers={servers} services={services} />
      </div>
    </header>
  );
}
