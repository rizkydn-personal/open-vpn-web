"use client";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Service } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";

export function ServiceMenu({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <div className="mobile-menu" ref={root}>
      <button
        ref={button}
        className="mobile-menu__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="service-menu"
        onClick={() => setOpen(!open)}
      >
        <Menu size={19} aria-hidden="true" /> Layanan <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <nav id="service-menu" className="mobile-menu__panel" aria-label="Layanan">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Beranda
          </Link>
          {services.map((service) =>
            service.available ? (
              <Link
                key={service.id}
                href={`/s/${encodeURIComponent(service.id)}`}
                aria-current={pathname === `/s/${service.id}` ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <ServiceIcon id={service.id} size={20} /> {service.label}
              </Link>
            ) : (
              <span key={service.id} aria-disabled="true">
                <ServiceIcon id={service.id} size={20} /> {service.label}
                <small>{service.reason ?? "Tidak tersedia"}</small>
              </span>
            ),
          )}
        </nav>
      )}
    </div>
  );
}
