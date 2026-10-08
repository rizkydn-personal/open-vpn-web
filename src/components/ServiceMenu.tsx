"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ServerGroup } from "@/lib/serverDirectory";
import type { Service } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";

export function ServiceMenu({
  servers,
  services,
}: {
  servers: Pick<ServerGroup, "id" | "label">[];
  services: Service[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const selectedServiceId = pathname.match(/^\/s\/([^/]+)/)?.[1];
  const selectedService = selectedServiceId
    ? services.find((service) => service.id === decodeURIComponent(selectedServiceId))
    : undefined;
  const serverId = pathname.match(/^\/server\/([^/]+)/)?.[1] ?? selectedService?.server_id;
  const currentServerServices = services.filter((service) => service.server_id === serverId);
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
        <Menu size={19} aria-hidden="true" /> {serverId ? "Layanan" : "Server"}{" "}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <nav
          id="service-menu"
          className="mobile-menu__panel"
          aria-label={serverId ? "Navigasi layanan" : "Navigasi server"}
        >
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Beranda
          </Link>
          {serverId
            ? currentServerServices.map((service) => (
                <Link
                  key={service.id}
                  href={`/s/${encodeURIComponent(service.id)}`}
                  aria-current={
                    pathname === `/s/${encodeURIComponent(service.id)}` ? "page" : undefined
                  }
                  onClick={() => setOpen(false)}
                >
                  <ServiceIcon id={service.id} size={20} /> {service.service_label ?? service.label}
                </Link>
              ))
            : servers.map((server) => (
                <Link
                  key={server.id}
                  href={`/server/${encodeURIComponent(server.id)}`}
                  aria-current={pathname === `/server/${server.id}` ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="server-nav-mark" aria-hidden="true" /> {server.label}
                </Link>
              ))}
        </nav>
      )}
    </div>
  );
}
