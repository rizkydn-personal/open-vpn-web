"use client";

import { Clock3, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { Service, ServerStatus } from "@/lib/vpnApi";
import { ServiceIcon } from "@/components/ServiceIcon";
import { AccountForm } from "@/components/AccountForm";
import { DurationCards } from "@/components/DurationCards";
import { PathLoader } from "@/components/PathLoader";
import { QuotaCountdown } from "@/components/QuotaCountdown";
import { ServerDirectory } from "@/components/ServerDirectory";
import { ServerServices } from "@/components/ServerServices";
import { useMeta } from "@/components/useMeta";
import { quotaForDuration, type QuotaEntry, type QuotaMap } from "@/components/quota";

// Token visual (didefinisikan worker tokens di src/styles/tokens.css); fallback
// di sini menjaga tampilan tetap waras bila token belum terisi.
const heroHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif)",
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

const sectionHeadingStyle: CSSProperties = {
  fontFamily: "var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif)",
  fontWeight: 800,
  letterSpacing: "-0.015em",
};

const quotaBoxStyle: CSSProperties = {
  background: "var(--surface-tint, #eaf3f8)",
  border: "1px solid color-mix(in srgb, var(--primary, #0866b5) 28%, transparent)",
  borderRadius: "var(--radius, 8px)",
  padding: "1rem 1.15rem",
};

export type Meta = {
  services: Service[];
  catalogUnavailable?: boolean;
  catalogFetchedAt?: number;
  statusUnavailable?: boolean;
  status: ServerStatus | null;
  statusFetchedAt?: number;
  serverNow?: string;
  quota: QuotaMap;
  quotaUnavailable?: boolean;
  unavailable: boolean;
  stale?: boolean;
  allowed_days: Array<1 | 3 | 7>;
  support_url?: string;
  turnstile_site_key?: string;
  siteMode?: "normal" | "notice" | "maintenance" | "closed";
  siteMessage?: string;
  pausedServices?: string[];
};

function NoticeBanner({ meta }: { meta: Meta }) {
  if (meta.siteMode !== "notice" || !meta.siteMessage) return null;
  return (
    <p className="notice" role="status">
      {meta.siteMessage}
    </p>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="panel loading-panel" role="status">
      <PathLoader size="md" decorative />
      <p>{label}...</p>
    </div>
  );
}

function MetaErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="panel" role="alert">
      <h2>Data tidak dapat dimuat</h2>
      <p>
        Koneksi ke server portal terputus. Periksa koneksi internet Anda lalu coba lagi. Akun yang
        sudah dibuat sebelumnya tidak terpengaruh.
      </p>
      <button className="button-primary" type="button" onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  );
}

function SiteStatePanel({ meta }: { meta: Meta }) {
  const closed = meta.siteMode === "closed";
  return (
    <section className="recovery-page" aria-labelledby="site-state-title" role="status">
      <svg className="broken-path" viewBox="0 0 240 60" aria-hidden="true">
        <path d="M8 30h72m18 0h134M80 22l8 8-8 8m18-16-8 8 8 8" />
        <circle cx="8" cy="30" r="4" />
        <circle cx="232" cy="30" r="4" />
      </svg>
      <p className="eyebrow">PORTAL AKUN VPN</p>
      <h1 id="site-state-title" style={heroHeadingStyle}>
        {closed ? "Portal ditutup" : "Portal sedang dirawat"}
      </h1>
      <p>
        {meta.siteMessage ||
          (closed
            ? "Layanan portal ini telah ditutup."
            : "Pembuatan akun sedang dihentikan sementara.")}
      </p>
      <p className="muted">
        Halaman ini memeriksa status portal secara berkala selama tab terbuka dan menampilkan portal
        lagi begitu tersedia.
      </p>
    </section>
  );
}

function ServiceView({ meta, serviceId }: { meta: Meta; serviceId: string }) {
  const days: Array<1 | 3 | 7> = meta.allowed_days.length > 0 ? meta.allowed_days : [1, 3, 7];
  const [day, setDay] = useState<1 | 3 | 7>(days[0] ?? 1);
  const selected = meta.services.find((service) => service.id === serviceId);
  const catalogUnavailable = meta.catalogUnavailable ?? meta.unavailable;
  const paused = meta.pausedServices?.includes(serviceId) ?? false;
  const quota: QuotaEntry | undefined = quotaForDuration(meta.quota, serviceId, day);

  if (!selected && meta.services.length > 0) {
    return (
      <section className="recovery-page" aria-labelledby="service-missing-title">
        <p className="eyebrow">Layanan VPN</p>
        <h1 id="service-missing-title">Layanan tidak tersedia</h1>
        <p>Layanan {serviceId} tidak ada di daftar server saat ini.</p>
        <Link className="button-primary recovery-home" href="/">
          Kembali ke beranda
        </Link>
      </section>
    );
  }

  if (!selected?.available || catalogUnavailable || paused) {
    return (
      <section className="service-page" aria-labelledby="service-title">
        <div className="service-heading">
          <span className="service-icon">
            <ServiceIcon id={serviceId} />
          </span>
          <div>
            <p className="eyebrow">Layanan VPN</p>
            <h1 id="service-title">{selected?.service_label ?? selected?.label ?? serviceId}</h1>
          </div>
        </div>
        <NoticeBanner meta={meta} />
        <div className="panel unavailable" role="status">
          <TriangleAlert aria-hidden="true" />
          <h2>
            {catalogUnavailable
              ? "Server sedang tidak dapat dihubungi"
              : paused
                ? "Pembuatan akun dijeda"
                : "Layanan tidak tersedia"}
          </h2>
          <p>
            {catalogUnavailable
              ? "Daftar layanan belum dapat diperbarui. Coba lagi beberapa saat."
              : paused
                ? "Admin menjeda pembuatan akun untuk layanan ini sementara waktu."
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
          ) : (
            <Link className="button-secondary" href="/">
              Lihat server dan layanan lain
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="service-page" aria-labelledby="service-title">
      <div className="service-heading">
        <span className="service-icon">
          <ServiceIcon id={serviceId} />
        </span>
        <div>
          <p className="eyebrow">Layanan VPN</p>
          <h1 id="service-title">{selected.service_label ?? selected.label}</h1>
          {selected.server_label ? (
            <p className="service-server-label">
              Server:{" "}
              {selected.server_id ? (
                <Link href={`/server/${encodeURIComponent(selected.server_id)}`}>
                  {selected.server_label}
                </Link>
              ) : (
                selected.server_label
              )}
            </p>
          ) : null}
          <p>Pilih durasi, buat akun, lalu simpan detail koneksi sebelum meninggalkan halaman.</p>
        </div>
      </div>
      <NoticeBanner meta={meta} />
      <DurationCards
        days={days}
        selected={day}
        onSelect={setDay}
        meta={meta}
        serviceId={serviceId}
      />
      <section className="panel service-account-panel" aria-label="Buat akun">
        <div className="quota-summary-inline" style={quotaBoxStyle}>
          <h2 style={sectionHeadingStyle}>Kuota hari ini</h2>
          {quota ? (
            <>
              <p className="quota-number">
                {quota.used}
                <span>/{quota.limit} terpakai</span>
              </p>
              <progress value={quota.used} max={quota.limit} aria-label="Kuota terpakai" />
              <p>
                Sisa {quota.remaining} akun {day} hari
              </p>
              <p className="muted">
                <Clock3 size={16} aria-hidden="true" /> <QuotaCountdown resetsAt={quota.resetsAt} />
              </p>
            </>
          ) : (
            <p role="status">Kuota belum dapat dimuat.</p>
          )}
        </div>
        <AccountForm
          service={selected}
          day={day}
          quota={quota}
          quotaUnavailable={meta.quotaUnavailable || !quota}
          turnstileSiteKey={meta.turnstile_site_key}
        />
      </section>
    </section>
  );
}

export function Portal({ serviceId, serverId }: { serviceId?: string; serverId?: string }) {
  const { meta, failed, retry } = useMeta();

  if (failed) {
    return <MetaErrorPanel onRetry={retry} />;
  }
  if (meta === null) {
    if (serviceId) {
      return (
        <section className="service-page" aria-label="Memuat">
          <LoadingPanel label="Memuat data layanan" />
        </section>
      );
    }
    if (serverId) {
      return (
        <section className="server-page" aria-label="Memuat">
          <LoadingPanel label="Memuat data server" />
        </section>
      );
    }
    return <LoadingPanel label="Memuat data portal" />;
  }

  if (meta.siteMode === "maintenance" || meta.siteMode === "closed") {
    return <SiteStatePanel meta={meta} />;
  }

  if (serverId) {
    return (
      <>
        <NoticeBanner meta={meta} />
        <ServerServices meta={meta} serverId={serverId} />
      </>
    );
  }

  if (serviceId) {
    return <ServiceView meta={meta} serviceId={serviceId} />;
  }

  return (
    <>
      <NoticeBanner meta={meta} />
      <ServerDirectory meta={meta} />
    </>
  );
}
