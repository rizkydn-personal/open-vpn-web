"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { groupServicesByServer } from "@/lib/serverDirectory";
import type { Service } from "@/lib/vpnApi";

export function NotFoundServices() {
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
  const servers = groupServicesByServer(services);
  return servers.length ? (
    <nav aria-label="Server yang tersedia">
      <h2>Atau buka salah satu server</h2>
      <ul className="not-found-services">
        {servers.map((server) => (
          <li key={server.id}>
            <Link href={`/server/${encodeURIComponent(server.id)}`}>{server.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  ) : (
    <p role="status">Daftar server belum dapat dimuat.</p>
  );
}
