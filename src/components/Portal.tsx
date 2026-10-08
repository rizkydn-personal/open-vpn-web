"use client";

import { Clock3, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Service, ServerStatus } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";
import { AccountForm } from "@/components/AccountForm";
import { ServerDirectory } from "@/components/ServerDirectory";
import { ServerServices } from "@/components/ServerServices";

export type Meta = {
  services: Service[];
  catalogUnavailable?: boolean;
  catalogFetchedAt?: number;
  statusUnavailable?: boolean;
  status: ServerStatus | null;
  statusFetchedAt?: number;
  serverNow?: string;
  quota: Record<string, { used: number; limit: number; remaining: number; resetsAt: string }>;
  quotaUnavailable?: boolean;
  unavailable: boolean;
  allowed_days: Array<1 | 3 | 7>;
  support_url?: string;
  turnstile_site_key?: string;
  siteMode?: "normal" | "notice" | "maintenance" | "closed";
  siteMessage?: string;
  pausedServices?: string[];
};

function countdown(iso?: string, now?: number): string | null {
  if (!iso || now === undefined || !Number.isFinite(now)) return null;
  const seconds = Math.max(0, Math.floor((Date.parse(iso) - now) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ageLabel(fetchedAt: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1000));
  if (seconds < 60) return "kurang dari semenit lalu";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  return `${Math.floor(minutes / 60)} jam lalu`;
}

function serviceState(status: ServerStatus, id: string, stale: boolean): string {
  const value = status.services?.[id];
  const prefix = stale ? "Terakhir diketahui " : "";
  if (value === true || value === "running") return `${prefix}aktif`;
  if (value === false || value === "stopped") return `${prefix}berhenti`;
  return "Belum ada data";
}

export function Portal({
  initial,
  serviceId,
  serverId,
}: {
  initial: Meta;
  serviceId?: string;
  serverId?: string;
}) {
  const meta = initial;
  const [tick, setTick] = useState<number | null>(null);
  const siteMode = initial.siteMode;

  useEffect(() => {
    setTick(Date.now());
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = meta.services.find((service) => service.id === serviceId);
  const quota = serviceId ? meta.quota[serviceId] : undefined;
  const catalogUnavailable = meta.catalogUnavailable ?? meta.unavailable;
  const statusUnavailable = meta.statusUnavailable ?? meta.unavailable;
  const now = tick ?? Date.parse(meta.serverNow ?? "");

  if (!serviceId) {
    if (serverId) return <ServerServices meta={meta} serverId={serverId} />;
    return <ServerDirectory meta={meta} />;
  }

  if (siteMode === "maintenance" || siteMode === "closed") {
    return (
      <section className="recovery-page" aria-labelledby="site-state-title">
        <svg className="broken-path" viewBox="0 0 240 60" aria-hidden="true">
          <path d="M8 30h72m18 0h134M80 22l8 8-8 8m18-16-8 8 8 8" />
          <circle cx="8" cy="30" r="4" />
          <circle cx="232" cy="30" r="4" />
        </svg>
        <p className="eyebrow">Portal akun VPN</p>
        <h1 id="site-state-title">
          {siteMode === "closed" ? "Portal ditutup" : "Portal sedang dirawat"}
        </h1>
        <p>
          {meta.siteMessage ||
            (siteMode === "closed"
              ? "Layanan portal ini telah ditutup."
              : "Pembuatan akun sedang dihentikan sementara.")}
        </p>
        <p className="muted">Muat ulang halaman untuk memeriksa status terbaru.</p>
      </section>
    );
  }

  if (serviceId) {
    return (
      <section className="service-page" aria-labelledby="service-title">
        <div className="service-heading">
          <span className="service-icon">
            <ServiceIcon id={serviceId} />
          </span>
          <div>
            <p className="eyebrow">Layanan VPN</p>
            <h1 id="service-title">{selected?.service_label ?? selected?.label ?? serviceId}</h1>
            {selected?.server_label ? (
              <p className="service-server-label">Server: {selected.server_label}</p>
            ) : null}
            <p>
              {selected?.available
                ? "Pilih durasi, lalu simpan detail koneksi sebelum meninggalkan halaman."
                : selected?.reason || "Layanan sedang tidak tersedia."}
            </p>
          </div>
        </div>
        {selected?.available && !catalogUnavailable ? (
          <section className="panel service-account-panel">
            <div className="quota-summary-inline">
              <h2>Kuota hari ini</h2>
              {quota ? (
                <>
                  <p className="quota-number">
                    {quota.used}
                    <span>/{quota.limit} terpakai</span>
                  </p>
                  <progress value={quota.used} max={quota.limit} aria-label="Kuota terpakai" />
                  <p>Sisa {quota.remaining} akun</p>
                  <p className="muted">
                    <Clock3 size={16} aria-hidden="true" /> Reset 00.00 WIB
                    {countdown(quota.resetsAt, now)
                      ? `, dalam ${countdown(quota.resetsAt, now)}`
                      : ", waktu reset belum tersedia"}
                  </p>
                </>
              ) : (
                <p role="status">Kuota belum dapat dimuat.</p>
              )}
            </div>
            <AccountForm
              embedded
              service={selected}
              days={meta.allowed_days}
              quota={quota}
              quotaUnavailable={meta.quotaUnavailable || !quota}
              turnstileSiteKey={meta.turnstile_site_key}
            />
          </section>
        ) : (
          <div className="panel unavailable" role="status">
            <TriangleAlert aria-hidden="true" />
            <h2>
              {catalogUnavailable
                ? "Server sedang tidak dapat dihubungi"
                : "Layanan tidak tersedia"}
            </h2>
            <p>
              {catalogUnavailable
                ? "Daftar layanan belum dapat diperbarui. Coba lagi beberapa saat."
                : selected?.reason || "Coba lagi nanti."}
            </p>
            {catalogUnavailable ? (
              <button
                className="button-secondary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Coba lagi
              </button>
            ) : null}
          </div>
        )}
      </section>
    );
  }

  const status = meta.status;
  const ram = status?.server?.ram as { used_mb?: number; total_mb?: number } | undefined;
  const uptime =
    typeof status?.server?.uptime_seconds === "number"
      ? `${Math.floor(status.server.uptime_seconds / 3600)} jam`
      : "Belum ada data";
  return (
    <>
      <section className="portal-intro" aria-labelledby="home-title">
        <p className="eyebrow">Portal akun VPN</p>
        <h1 id="home-title">Pilih layanan, buat akun, simpan detail koneksi.</h1>
        <p>
          Pilih durasi {meta.allowed_days.map((day) => `${day} hari`).join(", ")}. Detail akun
          ditampilkan di tab ini agar dapat Anda salin sebelum menutup halaman.
        </p>
      </section>
      {meta.unavailable ? (
        <p className="notice" role="status">
          <TriangleAlert aria-hidden="true" /> Sebagian data belum dapat diperbarui.
          {meta.catalogUnavailable && meta.catalogFetchedAt
            ? ` Daftar layanan terakhir diperbarui ${ageLabel(meta.catalogFetchedAt)}.`
            : ""}
          {statusUnavailable && meta.statusFetchedAt
            ? ` Status server terakhir diperbarui ${ageLabel(meta.statusFetchedAt)}.`
            : ""}
        </p>
      ) : null}
      {siteMode === "notice" && meta.siteMessage ? (
        <p className="notice" role="status">
          {meta.siteMessage}
        </p>
      ) : null}

      <section className="service-list-section" aria-labelledby="services-title">
        <h2 id="services-title">Pilih layanan</h2>
        {meta.services.length ? (
          <ul className="service-list">
            {meta.services.map((service) => {
              const itemQuota = meta.quota[service.id];
              return (
                <li className="service-list__row" key={service.id}>
                  <span className="service-list__icon">
                    <ServiceIcon id={service.id} size={22} />
                  </span>
                  <div className="service-list__details">
                    <h3>{service.label}</h3>
                    <p>
                      {meta.pausedServices?.includes(service.id)
                        ? "Pembuatan akun dijeda"
                        : catalogUnavailable
                          ? `Status terakhir diketahui ${service.available ? "tersedia" : "tidak tersedia"}`
                          : service.available
                            ? "Tersedia"
                            : service.reason || "Layanan tidak tersedia"}
                    </p>
                    <p>
                      {itemQuota
                        ? `Sisa kuota hari ini ${itemQuota.remaining} dari ${itemQuota.limit}`
                        : "Kuota hari ini belum tersedia"}
                    </p>
                  </div>
                  <Link
                    className="service-list__action"
                    href={`/s/${encodeURIComponent(service.id)}`}
                  >
                    {service.available && !meta.pausedServices?.includes(service.id)
                      ? `Buat akun ${service.label}`
                      : `Lihat ${service.label}`}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="panel" role="status">
            {catalogUnavailable
              ? "Daftar layanan belum dapat dimuat. Coba lagi beberapa saat."
              : "Belum ada layanan yang tersedia."}
          </p>
        )}
      </section>

      <section className="status-section" aria-labelledby="status-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Data layanan</p>
            <h2 id="status-title">Status Server</h2>
          </div>
          <p className="muted">
            {statusUnavailable
              ? meta.statusFetchedAt
                ? `Data terakhir ${ageLabel(meta.statusFetchedAt)}`
                : "Status belum tersedia"
              : "Data terbaru"}
          </p>
        </div>
        {status ? (
          <>
            {status.servers?.length ? (
              <ul className="server-status-list" aria-label="Status setiap server">
                {status.servers.map((server) => (
                  <li key={String(server.id)}>
                    <strong>{String(server.label ?? server.id)}</strong>
                    <span>
                      Uptime{" "}
                      {typeof server.uptime_seconds === "number"
                        ? `${Math.floor(server.uptime_seconds / 3600)} jam`
                        : "Belum ada data"}
                    </span>
                    <span>
                      RAM{" "}
                      {typeof (server.ram as { used_mb?: unknown } | undefined)?.used_mb ===
                        "number" &&
                      typeof (server.ram as { total_mb?: unknown } | undefined)?.total_mb ===
                        "number"
                        ? `${(server.ram as { used_mb: number }).used_mb} / ${(server.ram as { total_mb: number }).total_mb} MB`
                        : "Belum ada data"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!status.servers?.length ? (
              <dl className="status-metrics">
                <div>
                  <dt>Uptime</dt>
                  <dd>{uptime}</dd>
                </div>
                <div>
                  <dt>RAM</dt>
                  <dd>
                    {typeof ram?.used_mb === "number" && typeof ram.total_mb === "number"
                      ? `${ram.used_mb} / ${ram.total_mb} MB`
                      : "Belum ada data"}
                  </dd>
                </div>
              </dl>
            ) : null}
            <div className="status-table-wrap">
              <table className="status-table">
                <caption>Jumlah akun dan status setiap layanan</caption>
                <thead>
                  <tr>
                    <th scope="col">Layanan</th>
                    <th scope="col">Jumlah akun</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.services.map((service) => (
                    <tr key={service.id}>
                      <th scope="row">{service.label}</th>
                      <td>
                        {typeof status.accounts?.[service.id] === "number"
                          ? status.accounts[service.id]
                          : "Belum ada data"}
                      </td>
                      <td>
                        {statusUnavailable
                          ? serviceState(status, service.id, true)
                          : serviceState(status, service.id, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="panel" role="status">
            Status server belum dapat dimuat.
          </p>
        )}
      </section>

      <section className="quota-strip" aria-labelledby="quota-title">
        <h2 id="quota-title">Kuota hari ini</h2>
        {meta.services.length ? (
          <ul>
            {meta.services.map((service) => {
              const itemQuota = meta.quota[service.id];
              const remaining = itemQuota ? countdown(itemQuota.resetsAt, now) : null;
              return (
                <li key={service.id}>
                  <span>{service.label}</span>
                  <strong>
                    {itemQuota ? `${itemQuota.used} / ${itemQuota.limit}` : "Belum tersedia"}
                  </strong>
                  <small>
                    {itemQuota
                      ? `Reset 00.00 WIB${remaining ? `, dalam ${remaining}` : ""}`
                      : "Kuota belum dapat dimuat"}
                  </small>
                </li>
              );
            })}
          </ul>
        ) : (
          <p role="status">Kuota belum tersedia.</p>
        )}
      </section>

      {meta.support_url ? (
        <aside className="support-card">
          <h2>Dukungan</h2>
          <p>Informasi dukungan tersedia bila Anda memerlukannya.</p>
          <a href={meta.support_url} rel="noreferrer">
            Informasi dukungan
          </a>
        </aside>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {tick !== null ? "Status waktu diperbarui" : ""}
      </span>
    </>
  );
}
