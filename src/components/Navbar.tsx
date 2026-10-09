"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { Service } from "@/lib/vpnApi";
import { ServiceMenu } from "@/components/ServiceMenu";
import { NavLinks } from "@/components/NavLinks";
import { groupServicesByServer } from "@/lib/serverDirectory";

// Navigasi dimuat sisi klien agar header selalu ter-render instan tanpa
// menunggu API upstream.
export function Navbar() {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/meta", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (Array.isArray(payload?.data?.services)) setServices(payload.data.services);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const servers = groupServicesByServer(services).map(({ id, label }) => ({ id, label }));
  return (
    <header
      className="site-header"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="VPN Gratis, beranda">
          <span className="brand__mark">
            <ShieldCheck size={21} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span>
            <span className="brand__name">
              VPN Gratis<span style={{ color: "var(--primary)" }}>.</span>
            </span>
            <span className="brand__caption">rnpproject</span>
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
