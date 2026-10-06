"use client";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Service } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";

export function ServiceMenu({ services, current }: { services: Service[]; current?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
      if (open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        const links = [...(root.current?.querySelectorAll<HTMLAnchorElement>("[role=menuitem]") ?? [])];
        const index = links.indexOf(document.activeElement as HTMLAnchorElement);
        links[(index + (event.key === "ArrowDown" ? 1 : links.length - 1)) % links.length]?.focus();
      }
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open]);
  return <div className="mobile-menu" ref={root}>
    <button ref={button} className="mobile-menu__toggle" type="button" aria-expanded={open} aria-controls="service-menu" onClick={() => setOpen(!open)}>
      <Menu size={19} aria-hidden="true" /> Layanan <ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <nav id="service-menu" className="mobile-menu__panel" aria-label="Layanan" role="menu">
      <Link role="menuitem" href="/" onClick={() => setOpen(false)}>Beranda</Link>
      {services.map((service) => <Link role="menuitem" key={service.id} href={`/s/${encodeURIComponent(service.id)}`} aria-disabled={!service.available} title={service.reason ?? undefined} onClick={(e) => { if (!service.available) e.preventDefault(); else setOpen(false); }}>
        <ServiceIcon id={service.id} size={20} /> {service.label} {!service.available && <small>Tidak tersedia</small>}
      </Link>)}
    </nav>}
    <span className="sr-only">{current ?? ""}</span>
  </div>;
}
