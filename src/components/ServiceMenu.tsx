"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Service } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";

export function ServiceMenu({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open]);

  // focus on first link when opened
  useEffect(() => {
    if (open) {
      const firstLink = root.current?.querySelector<HTMLAnchorElement>("a");
      if (firstLink) firstLink.focus();
    }
  }, [open]);

  const currentServiceId = pathname.startsWith("/s/") ? pathname.slice(3) : "";

  return <div className="mobile-menu" ref={root}>
    <button ref={button} className="mobile-menu__toggle" type="button" aria-expanded={open} aria-controls="service-menu" onClick={() => setOpen(!open)}>
      <Menu size={19} aria-hidden="true" /> Layanan <ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <nav id="service-menu" className="mobile-menu__panel" aria-label="Layanan">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Beranda</Link>
      {services.map((service) => {
        const isCurrent = currentServiceId === service.id;
        return service.available ? (
          <Link key={service.id} href={`/s/${encodeURIComponent(service.id)}`} aria-current={isCurrent ? "page" : undefined}>
            <ServiceIcon id={service.id} size={20} /> {service.label}
          </Link>
        ) : (
          <span key={service.id} aria-disabled="true" title={`Tidak tersedia${service.reason ? `: ${service.reason}` : ""}`}>
            <ServiceIcon id={service.id} size={20} /> {service.label} <small>Tidak tersedia</small>
          </span>
        );
      })}
    </nav>}
  </div>;
}
