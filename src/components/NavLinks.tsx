"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Service } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";

export function NavLinks({ services }: { services: Service[] }) {
  const pathname = usePathname();
  return <>{<Link className={`desktop-nav__link ${pathname === "/" ? "is-current" : ""}`} href="/" aria-current={pathname === "/" ? "page" : undefined}>Beranda</Link>}{services.map((service) => {
    const active = pathname === `/s/${service.id}`;
    const content = <><ServiceIcon id={service.id} size={20} />{service.label}</>;
    return service.available ? <Link key={service.id} className={`desktop-nav__link ${active ? "is-current" : ""}`} href={`/s/${encodeURIComponent(service.id)}`} aria-current={active ? "page" : undefined}>{content}</Link> : <span key={service.id} className="desktop-nav__link is-disabled" aria-disabled="true">{content}<small>{service.reason ?? "Tidak tersedia"}</small></span>;
  })}</>;
}
