"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Service } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";

export function NavLinks({ services }: { services: Service[] }) {
  const pathname = usePathname();
  const current = pathname === "/" ? "/" : (pathname.startsWith("/s/") ? pathname.slice(3) : "");

  return (
    <nav className="desktop-nav" aria-label="Navigasi utama">
      <Link className={`desktop-nav__link ${pathname === "/" ? "is-current" : ""}`} href="/" aria-current={pathname === "/" ? "page" : undefined}>Beranda</Link>
      {services.map((service) => {
        const isCurrent = current === service.id;
        const className = `desktop-nav__link ${isCurrent ? "is-current" : ""} ${!service.available ? "is-disabled" : ""}`;
        const content = <><ServiceIcon id={service.id} size={20}/>{service.label}{!service.available && <span className="sr-only">Tidak tersedia</span>}</>;
        return service.available ? (
          <Link key={service.id} className={className} href={`/s/${encodeURIComponent(service.id)}`} aria-current={isCurrent ? "page" : undefined}>{content}</Link>
        ) : (
          <span key={service.id} className={className} aria-disabled="true" title={`Tidak tersedia${service.reason ? `: ${service.reason}` : ""}`}>{content}</span>
        );
      })}
    </nav>
  );
}
