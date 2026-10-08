import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import type { Meta } from "@/components/Portal";
import { ServiceIcon } from "@/components/ServiceIcon";
import { groupServicesByServer } from "@/lib/serverDirectory";

export function ServerServices({ meta, serverId }: { meta: Meta; serverId: string }) {
  const server = groupServicesByServer(meta.services).find((item) => item.id === serverId);
  if (!server)
    return (
      <section className="server-page" aria-labelledby="server-title">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} aria-hidden="true" /> Semua server
        </Link>
        <h1 id="server-title">Server belum dapat dimuat</h1>
        <p role="status">Daftar layanan server ini belum tersedia. Coba muat ulang halaman.</p>
      </section>
    );
  const status = meta.status?.servers?.find((item) => item.id === server.id);
  const location =
    server.location ?? (typeof status?.location === "string" ? status.location : undefined);
  const now = Date.parse(meta.serverNow ?? "");
  const remainingSeconds = (resetAt?: string) =>
    resetAt && Number.isFinite(now)
      ? Math.max(0, Math.floor((Date.parse(resetAt) - now) / 1000))
      : null;
  const formatCountdown = (seconds: number) =>
    `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <section className="server-page" aria-labelledby="server-title">
      <Link className="back-link" href="/">
        {" "}
        <ArrowLeft size={17} aria-hidden="true" /> Semua server
      </Link>
      <header className="server-page__heading">
        <p className="eyebrow">Pilih protokol</p>
        <h1 id="server-title">{server.label}</h1>
        <p className="server-location">Location: {location ?? "Belum diatur"}</p>
        <p>
          {typeof status?.uptime_seconds === "number"
            ? `Uptime ${Math.floor(status.uptime_seconds / 3600)} jam`
            : "Uptime belum tersedia"}
          {typeof status?.ping_ms === "number"
            ? ` · Ping ${status.ping_ms} ms`
            : " · Ping belum tersedia"}
        </p>
        <p className="server-page__description">
          Pilih protokol yang ingin digunakan. Setiap baris menunjukkan status layanan, jumlah akun
          yang tercatat, dan kuota pembuatan akun hari ini. Kuota kembali tersedia setelah reset
          pukul 00.00 WIB.
        </p>
      </header>
      {meta.statusUnavailable ? (
        <p className="notice" role="status">
          Status server terakhir diketahui.{" "}
          {meta.statusFetchedAt
            ? `Diperbarui ${new Date(meta.statusFetchedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB.`
            : ""}
        </p>
      ) : null}
      <div className="server-service-intro">
        <h2>Layanan di {server.label}</h2>
        <p>
          Buka layanan untuk memilih durasi dan membuat akun. Jika layanan sedang berhenti atau
          kuotanya habis, informasi tersebut akan terlihat sebelum Anda mengirim permintaan.
        </p>
      </div>
      <ul className="server-service-list">
        {server.services.map((service) => {
          const quota = meta.quota[service.id];
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
                <p>{paused ? "Pembuatan akun dijeda" : service.reason || displayedState}</p>
                <p>
                  {typeof accountCount === "number"
                    ? `Jumlah akun ${accountCount}`
                    : "Jumlah akun belum tersedia"}
                </p>
                <p>
                  {quota
                    ? `Sisa kuota hari ini ${quota.remaining} dari ${quota.limit}`
                    : "Kuota belum tersedia"}
                </p>
              </div>
              {quota ? (
                <small className="server-service-list__reset">
                  <Clock3 size={15} aria-hidden="true" /> Reset 00.00 WIB
                  {remainingSeconds(quota.resetsAt) === null
                    ? ""
                    : `, dalam ${formatCountdown(remainingSeconds(quota.resetsAt)!)}`}
                </small>
              ) : null}
              <Link className="service-list__action" href={`/s/${encodeURIComponent(service.id)}`}>
                {service.available && !paused
                  ? `Pilih ${service.service_label ?? service.label}`
                  : "Tidak tersedia"}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
