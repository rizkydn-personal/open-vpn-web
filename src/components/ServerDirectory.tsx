import Link from "next/link";
import { ArrowRight, Gauge, Server as ServerIcon, Users } from "lucide-react";
import type { Meta } from "@/components/Portal";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";
import { groupServicesByServer, serverAccountTotal, serverHealth } from "@/lib/serverDirectory";

const protocolDetails: Record<string, string> = {
  ssh: "Koneksi tunnel melalui SSH. Host, port, dan detail autentikasi mengikuti data dari server.",
  vmess:
    "Protokol VMess pada layanan Xray. Gunakan tautan atau konfigurasi yang ditampilkan setelah akun dibuat.",
  vless:
    "Protokol VLESS pada layanan Xray. Gunakan tautan atau konfigurasi yang ditampilkan setelah akun dibuat.",
  trojan:
    "Protokol Trojan pada layanan Xray. Gunakan tautan atau konfigurasi yang ditampilkan setelah akun dibuat.",
  "ovpn-tcp":
    "OpenVPN dengan transport TCP. Jika server memberikan berkas konfigurasi, unduh untuk diimpor ke aplikasi yang mendukung OpenVPN.",
  "ovpn-udp":
    "OpenVPN dengan transport UDP. Jika server memberikan berkas konfigurasi, unduh untuk diimpor ke aplikasi yang mendukung OpenVPN.",
};

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
        <h1 id="server-directory-title">Koneksi VPN Anda dimulai dengan memilih server.</h1>
        <p className="server-directory__intro">
          Pilih lokasi server dan protokol yang tersedia, tentukan masa aktif akun, lalu simpan
          detail koneksi setelah akun dibuat.
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
        <p className="eyebrow">Pilih server</p>
        <h2 id="server-selection-title">Server yang tersedia</h2>
        <p>
          Bandingkan lokasi, status, kapasitas, dan protokol. Pilih server untuk melihat status
          layanan serta kuota yang berlaku.
        </p>
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
          <p className="eyebrow">Panduan portal</p>
          <h2 id="portal-guide-title">Pilih server, lalu siapkan detail koneksi.</h2>
          <p>
            Tiap server dapat menyediakan protokol dan kuota yang berbeda. Buka server untuk
            membandingkan layanan aktif, jumlah akun, dan sisa kuota sebelum membuat akun.
          </p>
        </header>

        <ol className="portal-guide__steps">
          <li>
            <h3>Pilih server</h3>
            <p>
              Lokasi adalah lokasi yang dikonfigurasi untuk server. Online berarti API server
              menjawab permintaan status terakhir dari portal, dan uptime menunjukkan lama proses
              server berjalan.
            </p>
          </li>
          <li>
            <h3>Pilih layanan dan durasi</h3>
            <p>
              Di halaman server, periksa status protokol, jumlah akun, dan kuota hari ini. Pilih
              salah satu durasi yang tersedia pada formulir layanan.
            </p>
          </li>
          <li>
            <h3>Buat dan simpan akun</h3>
            <p>
              Username dibuat otomatis. Setelah akun berhasil, salin detail atau unduh berkas
              konfigurasi bila server menyediakannya.
            </p>
          </li>
        </ol>

        {protocols.length ? (
          <section className="protocol-guide" aria-labelledby="protocol-guide-title">
            <h2 id="protocol-guide-title">Mengenal protokol</h2>
            <p>
              Daftar ini mengikuti layanan yang dikirim API. Format konfigurasi dan aplikasi yang
              cocok dapat berbeda; gunakan detail koneksi yang diberikan server.
            </p>
            <ul className="protocol-guide__list">
              {protocols.map((service) => {
                const key = service.upstream_id ?? service.id.split("--").at(-1) ?? service.id;
                return (
                  <li key={key}>
                    <h3>{service.service_label ?? service.label}</h3>
                    <p>
                      {protocolDetails[key] ??
                        "Lihat detail koneksi dari server setelah akun dibuat untuk mengetahui format layanan ini."}
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
            Kuota dihitung per layanan dan direset setiap pukul 00.00 WIB. Detail akun tampil di tab
            ini dan disimpan sementara di session storage. Jika halaman dimuat ulang, detail hanya
            dipulihkan selama belum lewat 30 menit. Salin atau unduh setelah akun dibuat.
          </p>
        </aside>
      </section>
    </section>
  );
}
