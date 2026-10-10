import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import type { Meta } from "@/components/Portal";
import { ServiceIcon } from "@/components/ServiceIcon";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";
import { QuotaCountdown } from "@/components/QuotaCountdown";
import { quotaTotals } from "@/components/quota";
import { groupServicesByServer, serverHealth } from "@/lib/serverDirectory";
import { formatUptime, formatWib } from "@/lib/time";

export function ServerServices({ meta, serverId }: { meta: Meta; serverId: string }) {
  const server = groupServicesByServer(meta.services).find((item) => item.id === serverId);
  if (!server)
    return (
      <section className="server-page server-services-restyle" aria-labelledby="server-title">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} aria-hidden="true" /> Semua server
        </Link>
        <h1 id="server-title">Server belum dapat dimuat</h1>
        <p role="status">Daftar layanan server ini belum tersedia. Coba muat ulang halaman ini.</p>
      </section>
    );
  const status = meta.status?.servers?.find((item) => item.id === server.id);
  const location =
    server.location ?? (typeof status?.location === "string" ? status.location : undefined);
  return (
    <section className="server-page server-services-restyle" aria-labelledby="server-title">
      <Link className="back-link" href="/">
        <ArrowLeft size={17} aria-hidden="true" /> Semua server
      </Link>
      <header className="server-page__heading">
        <p className="eyebrow">Pilih protokol</p>
        <h1 id="server-title">{server.label}</h1>
        <div className="server-page__meta">
          <ServerStatusBadge
            health={serverHealth(meta.status?.servers, server.id, meta.statusUnavailable)}
            available={server.services.filter((service) => service.available).length}
          />
          {location ? <span className="server-location">{location}</span> : null}
          {typeof status?.uptime_seconds === "number" && formatUptime(status.uptime_seconds) ? (
            <span className="server-uptime">Uptime {formatUptime(status.uptime_seconds)}</span>
          ) : null}
        </div>
        <p className="server-page__description">
          Setiap baris di bawah merangkum status protokol, jumlah akun, dan sisa kuota hari ini.
          Kuota kembali penuh setiap pukul 00.00 WIB.
        </p>
      </header>
      {meta.statusUnavailable ? (
        <p className="notice" role="status">
          Status server terakhir diketahui.{" "}
          {meta.statusFetchedAt ? `Diperbarui ${formatWib(new Date(meta.statusFetchedAt))}.` : ""}
        </p>
      ) : null}
      <div className="server-service-intro">
        <h2>Protokol di {server.label}</h2>
      </div>
      <ul className="server-service-list">
        {server.services.map((service) => {
          const quota = quotaTotals(meta.quota, service.id);
          const accountCount = meta.status?.accounts?.[service.id];
          const state = meta.status?.services?.[service.id];
          const stateText =
            state === "running" || state === true
              ? "Aktif"
              : state === "stopped" || state === false
                ? "Berhenti"
                : service.available
                  ? "Tersedia"
                  : "Tidak tersedia";
          const displayedState = meta.statusUnavailable
            ? `Terakhir diketahui ${stateText.toLowerCase()}`
            : stateText;
          const paused = meta.pausedServices?.includes(service.id);
          return (
            <li key={service.id}>
              <span className="service-list__icon">
                <ServiceIcon id={service.id} size={22} />
              </span>
              <div className="service-list__details">
                <h2>{service.service_label ?? service.label}</h2>
                <p className="service-list__meta">
                  <span>{paused ? "Pembuatan akun dijeda" : service.reason || displayedState}</span>
                  <span>
                    {typeof accountCount === "number"
                      ? `Jumlah akun ${accountCount}`
                      : "Jumlah akun belum tersedia"}
                  </span>
                </p>
                <p>
                  {quota
                    ? `Sisa kuota hari ini ${quota.remaining} dari ${quota.limit}`
                    : "Kuota belum tersedia"}
                </p>
              </div>
              {quota ? (
                <small className="server-service-list__reset">
                  <Clock3 size={15} aria-hidden="true" />{" "}
                  <QuotaCountdown resetsAt={quota.resetsAt} />
                </small>
              ) : null}
              <Link
                className={
                  service.available && !paused
                    ? "service-list__action"
                    : "service-list__action service-list__action--off"
                }
                href={`/s/${encodeURIComponent(service.id)}`}
              >
                {service.available && !paused
                  ? `Pilih ${service.service_label ?? service.label}`
                  : "Lihat status"}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
