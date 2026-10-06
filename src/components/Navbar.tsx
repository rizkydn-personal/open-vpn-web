import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getServices } from "@/lib/vpnApi";
import type { Service } from "@/lib/vpnApi";
import { ServiceMenu } from "@/components/ServiceMenu";
import { ServiceIcon } from "@/components/ServiceIcon";

export async function Navbar({ current }: { current?: string }) {
  let services: Service[] = [];
  try { services = (await getServices()).value; } catch { /* Show home only until service catalog is available. */ }
  return <header className="site-header"><div className="site-header__inner">
    <Link className="brand" href="/" aria-label="VPN Gratis, beranda"><span className="brand__mark"><ShieldCheck size={21} strokeWidth={1.75} aria-hidden="true" /></span><span><span className="brand__name">VPN Gratis</span><span className="brand__caption">Portal akun VPN</span></span></Link>
    <nav className="desktop-nav" aria-label="Navigasi utama"><Link className={`desktop-nav__link ${!current ? "is-current" : ""}`} href="/" aria-current={!current ? "page" : undefined}>Beranda</Link>
      {services.map((service) => { const className=`desktop-nav__link ${current === service.id ? "is-current" : ""} ${!service.available ? "is-disabled" : ""}`; const content=<><ServiceIcon id={service.id} size={20}/>{service.label}{!service.available&&<span className="sr-only">Tidak tersedia</span>}</>; return service.available?<Link key={service.id} className={className} href={`/s/${encodeURIComponent(service.id)}`} aria-current={current===service.id?"page":undefined}>{content}</Link>:<span key={service.id} className={className} aria-disabled="true" title={`Tidak tersedia${service.reason?`: ${service.reason}`:""}`}>{content}</span>;})}
    </nav><ServiceMenu services={services} current={current} />
  </div></header>;
}
