"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  return services.length ? (
    <nav aria-label="Layanan yang tersedia">
      <h2>Layanan yang tersedia</h2>
      <ul className="not-found-services">
        {services.map((service) => (
          <li key={service.id}>
            <Link href={`/s/${encodeURIComponent(service.id)}`}>
              {service.label} {service.available ? "" : "(sedang tidak tersedia)"}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  ) : (
    <p role="status">Daftar layanan belum dapat dimuat.</p>
  );
}
