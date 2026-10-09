import Link from "next/link";
import { ArrowRight, Gauge, Server as ServerIcon, Users } from "lucide-react";
import type { Meta } from "@/components/Portal";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";
import { groupServicesByServer, serverAccountTotal, serverHealth } from "@/lib/serverDirectory";

const protocolDetails: Record<string, string> = {
  ssh: "Hasilnya host, port, username, dan kata sandi untuk dimasukkan ke aplikasi tunnel SSH.",
  vmess:
    "Protokol Xray. Hasilnya tautan koneksi (biasanya diawali vmess://) untuk diimpor ke aplikasi klien yang mendukung VMess.",
  vless:
    "Protokol Xray. Hasilnya tautan koneksi (biasanya diawali vless://) untuk diimpor ke aplikasi klien yang mendukung VLESS.",
  trojan:
    "Protokol Xray. Hasilnya tautan koneksi (biasanya diawali trojan://) untuk diimpor ke aplikasi klien yang mendukung Trojan.",
  "ovpn-tcp":
    "OpenVPN lewat TCP. Bila server menyediakan berkas .ovpn, unduh lalu impor ke aplikasi OpenVPN.",
  "ovpn-udp":
    "OpenVPN lewat UDP. Bila server menyediakan berkas .ovpn, unduh lalu impor ke aplikasi OpenVPN.",
};

function listDays(days: number[]): string {
  if (days.length === 0) return "beberapa hari";
  if (days.length === 1) return `${days[0]} hari`;
  const head = days.slice(0, -1).join(", ");
  return `${head}${days.length > 2 ? "," : ""} atau ${days[days.length - 1]} hari`;
}

export function ServerDirectory({ meta }: { meta: Meta }) {
  const servers = groupServicesByServer(meta.services);
  const protocols = Array.from(
    new Map(
      servers
        .flatMap((server) => server.services)
        .map((service) => [
          service.upstream_id ?? service.id.split("--").at(-1) ?? service.id,
          service,
        ]),
    ).values(),
  );
  return (
    <section className="server-directory" aria-labelledby="server-directory-title">
      <header className="server-directory__hero">
        <p className="eyebrow">Portal akun VPN</p>
        <h1 id="server-directory-title">
          Buat akun VPN gratis untuk {listDays(meta.allowed_days)}.
        </h1>
        <p className="server-directory__intro">
          Pilih server dan protokol, buat akunnya, lalu salin detail koneksi. Detail disimpan di tab
          ini selama paling lama 30 menit.
        </p>
      </header>
      {meta.unavailable ? (
        <p className="notice" role="status">
          Sebagian data server belum dapat diperbarui.{" "}
          {meta.statusFetchedAt
            ? `Status terakhir diperbarui ${new Date(meta.statusFetchedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB.`
            : ""}
        </p>
      ) : null}
      <div className="server-directory__selection">
        <h2 id="server-selection-title">Pilih server</h2>
        <p>Buka satu server untuk melihat status tiap protokol dan sisa kuota hari ini.</p>
      </div>
      {servers.length ? (
        <ul className="server-card-list">
          {servers.map((server) => {
            const status = meta.status?.servers?.find((item) => item.id === server.id);
            const available = server.services.filter((service) => service.available).length;
            const uptime = status?.uptime_seconds;
            const location =
              server.location ??
              (typeof status?.location === "string" ? status.location : undefined);
            const health = serverHealth(meta.status?.servers, server.id, meta.statusUnavailable);
            const accounts = serverAccountTotal(server, meta.status?.accounts);
            return (
              <li key={server.id}>
                <Link className="server-card" href={`/server/${encodeURIComponent(server.id)}`}>
                  <span className="server-card__head">
                    <span className="server-card__icon">
                      <ServerIcon aria-hidden="true" />
                    </span>
                    <span className="server-card__title">
                      <strong>{server.label}</strong>
                      <span>{location ?? "Lokasi belum diatur"}</span>
                    </span>
                    <ArrowRight className="server-card__arrow" aria-hidden="true" />
                  </span>
                  <ServerStatusBadge health={health} available={available} />
                  <span className="server-card__block">
                    <span className="server-card__label">Protokol</span>
                    <span className="chip-list">
                      {server.services.map((service) => (
                        <span
                          className={service.available ? "chip" : "chip chip--off"}
                          key={service.id}
                        >
                          {service.service_label ?? service.label}
                          {service.available ? null : (
                            <span className="sr-only"> (tidak tersedia)</span>
                          )}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="server-card__stats">
                    <span className="stat-tile">
                      <span className="server-card__label">
                        {server.capacity ? "Kapasitas" : "Akun tercatat"}
                      </span>
                      <strong>
                        <Users size={18} aria-hidden="true" />
                        {accounts === null
                          ? "Belum ada data"
                          : server.capacity
                            ? `${accounts} / ${server.capacity}`
                            : accounts}
                      </strong>
                    </span>
                    {server.bandwidth ? (
                      <span className="stat-tile">
                        <span className="server-card__label">Bandwidth</span>
                        <strong>
                          <Gauge size={18} aria-hidden="true" />
                          {server.bandwidth}
                        </strong>
                      </span>
                    ) : null}
                    <span className="stat-tile">
                      <span className="server-card__label">Uptime</span>
                      <strong>
                        {typeof uptime === "number"
                          ? `${Math.floor(uptime / 3600)} jam`
                          : "Belum ada data"}
                      </strong>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="panel" role="status">
          Daftar server belum dapat dimuat. Coba lagi beberapa saat.
        </p>
      )}

      <section className="portal-guide" aria-labelledby="portal-guide-title">
        <header className="portal-guide__heading">
          <h2 id="portal-guide-title">Cara kerja</h2>
        </header>

        <ol className="portal-guide__steps">
          <li>
            <h3>Bandingkan server</h3>
            <p>
              Kartu server menunjukkan lokasi, status, dan protokol. Online berarti server menjawab
              pengecekan status terakhir. Uptime adalah lama server menyala.
            </p>
          </li>
          <li>
            <h3>Pilih protokol dan durasi</h3>
            <p>
              Di halaman server, lihat status tiap protokol, jumlah akun, dan sisa kuota hari ini.
              Lalu pilih durasi akun.
            </p>
          </li>
          <li>
            <h3>Buat dan simpan akun</h3>
            <p>
              Username dan kata sandi dibuat otomatis. Setelah akun jadi, salin detailnya atau unduh
              berkas konfigurasi bila tersedia.
            </p>
          </li>
        </ol>

        {protocols.length ? (
          <section className="protocol-guide" aria-labelledby="protocol-guide-title">
            <h2 id="protocol-guide-title">Mengenal protokol</h2>
            <p>
              Tiap protokol memberi detail koneksi yang berbeda. Pakai persis yang tampil setelah
              akun dibuat.
            </p>
            <ul className="protocol-guide__list">
              {protocols.map((service) => {
                const key = service.upstream_id ?? service.id.split("--").at(-1) ?? service.id;
                return (
                  <li key={key}>
                    <h3>{service.service_label ?? service.label}</h3>
                    <p>
                      {protocolDetails[key] ??
                        "Detail koneksi untuk protokol ini tampil setelah akun dibuat."}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <aside className="portal-guide__note">
          <h2>Kuota dan penyimpanan detail</h2>
          <p>
            Kuota dihitung per layanan dan kembali penuh setiap pukul 00.00 WIB. Detail akun
            disimpan sementara di tab ini (session storage) selama paling lama 30 menit, jadi salin
            atau unduh segera setelah akun dibuat.
          </p>
        </aside>
      </section>
      {meta.support_url ? (
        <aside className="support-card">
          <h2>Dukungan</h2>
          <p>Butuh bantuan memakai detail koneksi? Hubungi dukungan lewat tautan berikut.</p>
          <a href={meta.support_url} rel="noreferrer">
            Informasi dukungan
          </a>
        </aside>
      ) : null}
    </section>
  );
}
