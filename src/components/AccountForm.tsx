"use client";
import { useEffect, useRef, useState } from "react";
import { EyeOff, TriangleAlert } from "lucide-react";
import type { Service, CreatedAccount } from "@/lib/vpnApi";
import { CopyButton } from "@/components/CopyButton";
import { formatWib } from "@/lib/time";
import { clientErrorMessage } from "@/lib/clientErrors";
import { readStoredAccount, writeStoredAccount } from "@/lib/accountStorage";
import { PathLoader } from "@/components/PathLoader";
import type { QuotaEntry } from "@/components/quota";

// Field tambahan (service, created_at, max_sessions) dikirim API tetapi
// diabaikan skema validasi sisi server. Dibaca defensif: tampil bila ada.
type AccountResult = CreatedAccount & {
  service?: string;
  created_at?: string;
  max_sessions?: number;
};

function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : Array.isArray(value)
      ? value.map(textValue).join(", ")
      : typeof value === "object" && value
        ? JSON.stringify(value)
        : "";
}

function Field({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: string;
  copyValue?: string;
}) {
  if (!value) return null;
  return (
    <div className="account-field">
      <dt>{label}</dt>
      <dd>
        <span className="technical-value technical-value--box">{value}</span>
        <CopyButton value={copyValue ?? value} />
      </dd>
    </div>
  );
}

function downloadOvpn(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SshDetails({ connection }: { connection: Record<string, unknown> }) {
  const ports =
    connection.ports && typeof connection.ports === "object"
      ? Object.entries(connection.ports)
          .filter(([, active]) => active === true)
          .map(([port]) => port)
      : [];
  return (
    <div className="payload-block payload-block--polish">
      <h3>Detail koneksi SSH</h3>
      <dl>
        <Field label="Host" value={textValue(connection.host)} />
        <Field label="Kata sandi" value={textValue(connection.password)} />
        {ports.length > 0 ? (
          <div className="account-field">
            <dt>Port</dt>
            <dd>
              <span className="technical-value technical-value--box">{ports.join(", ")}</span>
              <CopyButton value={ports.join(", ")} />
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="muted">
        {ports.length > 0
          ? "Masukkan host, username, kata sandi, dan salah satu port di atas ke aplikasi SSH atau tunneling."
          : "Masukkan host, username, dan kata sandi ke aplikasi SSH atau tunneling."}
      </p>
    </div>
  );
}

function XrayDetails({
  connection,
  protocol,
}: {
  connection: Record<string, unknown>;
  protocol: string;
}) {
  const links =
    connection.links && typeof connection.links === "object"
      ? (connection.links as Record<string, unknown>)
      : {};
  const wsTls = textValue(links.ws_tls);
  const wsNoneTls = textValue(links.ws_none_tls);
  const credentialLabel = protocol === "trojan" ? "Kata sandi" : "UUID";
  const credential = textValue(connection.uuid ?? connection.password);
  return (
    <div className="payload-block payload-block--polish">
      <h3>Tautan koneksi siap impor</h3>
      <dl>
        <Field label={credentialLabel} value={credential} />
        {wsTls ? (
          <div className="account-field account-field--link">
            <dt>TLS (port 443)</dt>
            <dd>
              <span className="technical-value">{wsTls}</span>
              <CopyButton value={wsTls} />
            </dd>
          </div>
        ) : null}
        {wsNoneTls ? (
          <div className="account-field account-field--link">
            <dt>Tanpa TLS (port 80)</dt>
            <dd>
              <span className="technical-value">{wsNoneTls}</span>
              <CopyButton value={wsNoneTls} />
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="muted">
        Salin salah satu tautan di atas lalu impor ke aplikasi klien yang mendukung{" "}
        {protocol === "vmess" ? "VMess" : protocol === "vless" ? "VLESS" : "Trojan"}.
      </p>
    </div>
  );
}

function OvpnDetails({ connection }: { connection: Record<string, unknown> }) {
  const filename = textValue(connection.filename) || "config.ovpn";
  const content = typeof connection.content === "string" ? connection.content : "";
  const proto = textValue(connection.proto).toUpperCase();
  return (
    <div className="payload-block payload-block--polish">
      <h3>Berkas konfigurasi OpenVPN</h3>
      <dl>
        <Field label="Host" value={textValue(connection.host)} />
        <Field label="Port" value={textValue(connection.port)} />
        {proto ? <Field label="Protokol" value={proto} /> : null}
        <div className="account-field">
          <dt>Berkas</dt>
          <dd>
            <span className="technical-value technical-value--box">{filename}</span>
            {content ? (
              <button
                type="button"
                className="copy-button"
                onClick={() => downloadOvpn(filename, content)}
              >
                Unduh
              </button>
            ) : null}
          </dd>
        </div>
      </dl>
      <p className="muted">Unduh berkas .ovpn lalu impor ke aplikasi OpenVPN.</p>
    </div>
  );
}

function GenericDetails({ connection }: { connection: Record<string, unknown> }) {
  const entries = Object.entries(connection).filter(
    ([key, value]) => !["filename", "content"].includes(key) && textValue(value),
  );
  if (entries.length === 0) return null;
  return (
    <div className="payload-block payload-block--polish">
      <h3>Detail koneksi</h3>
      <dl>
        {entries.map(([key, value]) => (
          <Field key={key} label={key.replaceAll("_", " ")} value={textValue(value)} />
        ))}
      </dl>
    </div>
  );
}

function protocolOf(serviceId: string): string {
  return serviceId.split("--").at(-1) ?? serviceId;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        target: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const STAGE_RESERVING_MS = 2500;
const STAGE_CONTACTING_MS = 8000;

export function AccountForm({
  service,
  day,
  quota,
  quotaUnavailable = false,
  turnstileSiteKey,
}: {
  service: Service;
  day: 1 | 3 | 7;
  quota?: QuotaEntry;
  quotaUnavailable?: boolean;
  turnstileSiteKey?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AccountResult | null>(null);
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const resultKey = `open-vpn-web:account-result:${service.id}:${day}`;

  useEffect(() => {
    try {
      const account = readStoredAccount(sessionStorage, resultKey);
      if (account) setResult(account as AccountResult);
    } catch {
      sessionStorage.removeItem(resultKey);
    }
  }, [resultKey]);
  useEffect(() => {
    try {
      if (result) writeStoredAccount(sessionStorage, resultKey, result);
      else sessionStorage.removeItem(resultKey);
    } catch {
      /* Storage may be disabled. */
    }
  }, [result, resultKey]);
  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);
  useEffect(() => {
    if (!busy) {
      setElapsedMs(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - started), 500);
    return () => window.clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    if (!turnstileSiteKey || !widget.current) return;
    let cancelled = false;
    const render = () => {
      if (!cancelled && window.turnstile && widget.current && !widgetId.current)
        widgetId.current = window.turnstile.render(widget.current, {
          sitekey: turnstileSiteKey,
          callback: setToken,
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (window.turnstile) render();
    else if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      script.addEventListener("load", render);
      document.head.append(script);
    } else script.addEventListener("load", render);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      if (widgetId.current) {
        window.turnstile?.remove?.(widgetId.current);
        widgetId.current = undefined;
      }
    };
  }, [turnstileSiteKey]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (turnstileSiteKey && !token) {
      setError("Selesaikan verifikasi keamanan di atas.");
      return;
    }
    setBusy(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["cf-turnstile-response"] = token;
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers,
        body: JSON.stringify({ service: service.id, days: day }),
        signal: controller.signal,
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      const data = payload as { error?: { code?: string }; data?: AccountResult };
      if (!response.ok) {
        setError(
          clientErrorMessage(
            response.status,
            data.error?.code,
            response.headers.get("retry-after"),
          ),
        );
        return;
      }
      if (data.data) setResult(data.data);
      else setError(clientErrorMessage(500));
    } catch (e) {
      setError(
        clientErrorMessage(
          undefined,
          e instanceof DOMException && e.name === "AbortError" ? "timeout" : "network",
        ),
      );
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
      if (turnstileSiteKey) {
        setToken("");
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      }
    }
  }

  if (result) {
    const protocol = protocolOf(result.service ?? service.id);
    const connection = result.connection ?? {};
    const allText = [
      `Layanan: ${service.service_label ?? service.label}`,
      `Username: ${result.username}`,
      `Berlaku sampai: ${result.expires_at}`,
      ...Object.entries(connection)
        .filter(([key]) => key !== "content")
        .map(([key, value]) => `${key}: ${textValue(value)}`),
    ].join("\n");
    return (
      <section className="panel result-card result-card--polish" aria-live="polite">
        <style>{`
          /* Restyle kartu hasil akun (milik worker restyle): bahasa visual baru via token CSS. */
          .result-card.result-card--polish {
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-soft);
            padding: clamp(1.25rem, 4vw, 2rem);
          }
          .result-card--polish > h2 {
            font-family: var(--font-sans);
            font-weight: 700;
            letter-spacing: -0.01em;
            margin: 0 0 1rem;
          }
          .result-once.result-once--polish {
            display: flex;
            align-items: flex-start;
            gap: 0.6rem;
            background: var(--warm-tint);
            border: 1px solid var(--warm);
            border-radius: var(--radius);
            padding: 0.75rem 1rem;
            font-size: 0.92rem;
            color: var(--ink);
          }
          .result-once--polish > svg {
            flex: none;
            margin-top: 0.2rem;
          }
          .account-facts.account-facts--polish dt {
            text-transform: uppercase;
            letter-spacing: 0.07em;
            font-size: 0.72rem;
            font-weight: 700;
            color: var(--muted);
          }
          .account-facts.account-facts--polish dd {
            color: var(--ink);
            font-weight: 600;
          }
          .technical-value.technical-value--box {
            display: inline-block;
            background: var(--surface-tint);
            border: 1px solid var(--line);
            border-radius: 0.5rem;
            padding: 0.3rem 0.65rem;
            color: var(--ink);
          }
          .payload-block.payload-block--polish {
            background: var(--surface-tint);
            border: 1px solid var(--line);
            border-radius: var(--radius);
          }
          .payload-block--polish h3 {
            font-family: var(--font-sans);
            color: var(--ink);
          }
          .copy-button.copy-button--pill {
            border-radius: var(--radius-pill);
            min-height: 0;
            padding: 0.35rem 0.8rem;
            font-size: 0.8rem;
            font-weight: 700;
          }
          .copy-button.copy-button--pill:hover {
            border-color: var(--primary);
            background: color-mix(in srgb, var(--primary) 8%, var(--surface));
          }
          .copy-button.copy-button--pill:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
          }
          .result-actions__lead .copy-button.copy-button--pill {
            background: var(--primary);
            border-color: var(--primary);
            color: #fff;
          }
          .result-actions__lead .copy-button.copy-button--pill:hover {
            background: var(--primary-hover);
            border-color: var(--primary-hover);
          }
        `}</style>
        <h2 ref={resultHeading} tabIndex={-1}>
          Akun berhasil dibuat
        </h2>
        <p className="notice">
          <TriangleAlert aria-hidden="true" />
          Detail akun tersimpan sementara di tab ini, maksimal 30 menit. Salin atau unduh sekarang.
        </p>
        <p className="result-once result-once--polish">
          <EyeOff size={18} aria-hidden="true" />
          <span>
            <strong>Hanya tampil sekali.</strong> Setelah tab ini ditutup, detail tidak dapat
            dilihat lagi.
          </span>
        </p>
        <dl className="account-facts account-facts--polish">
          <div>
            <dt>Layanan</dt>
            <dd>{service.service_label ?? service.label}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>
              <span className="technical-value">{result.username}</span>
              <CopyButton value={result.username} />
            </dd>
          </div>
          {result.created_at ? (
            <div>
              <dt>Dibuat</dt>
              <dd>{formatWib(result.created_at)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Masa aktif</dt>
            <dd>{day} hari</dd>
          </div>
          <div>
            <dt>Berlaku sampai</dt>
            <dd>{formatWib(result.expires_at)}</dd>
          </div>
          <div>
            <dt>Batas sesi bersamaan</dt>
            <dd>{result.max_sessions ?? "1 (bawaan)"}</dd>
          </div>
        </dl>
        {protocol === "ssh" ? (
          <SshDetails connection={connection} />
        ) : ["vmess", "vless", "trojan"].includes(protocol) ? (
          <XrayDetails connection={connection} protocol={protocol} />
        ) : protocol === "ovpn-tcp" || protocol === "ovpn-udp" ? (
          <OvpnDetails connection={connection} />
        ) : (
          <GenericDetails connection={connection} />
        )}
        <div className="result-actions">
          <span className="result-actions__lead">
            <CopyButton label="Salin semua detail" value={allText} />
          </span>
          <button className="button-secondary" type="button" onClick={() => setResult(null)}>
            Buat lagi
          </button>
        </div>
      </section>
    );
  }

  const busyLabel =
    elapsedMs >= STAGE_CONTACTING_MS
      ? "Server masih memproses, jangan tutup halaman ini"
      : elapsedMs >= STAGE_RESERVING_MS
        ? "Menghubungi server"
        : "Memesan kuota";

  return (
    <form className="create-form create-form--embedded" onSubmit={submit}>
      <h2>Buat akun {day} hari</h2>
      {turnstileSiteKey && (
        <div className="turnstile">
          <div ref={widget} aria-label="Verifikasi keamanan" />
        </div>
      )}
      {quotaUnavailable ? (
        <p className="form-error" role="status">
          Kuota belum dapat diperiksa. Coba lagi beberapa saat.
        </p>
      ) : null}
      {quota?.remaining === 0 && (
        <p className="form-error">Kuota {day} hari habis. Reset 00.00 WIB.</p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button-primary"
        disabled={
          busy || quotaUnavailable || quota?.remaining === 0 || Boolean(turnstileSiteKey && !token)
        }
        type="submit"
      >
        {busy ? (
          <>
            <PathLoader size="sm" label={busyLabel} /> {busyLabel}
          </>
        ) : (
          "Buat akun"
        )}
      </button>
      {turnstileSiteKey && !token && (
        <p className="muted">Selesaikan verifikasi keamanan di atas.</p>
      )}
      <p className="muted">
        Anda tidak perlu mengisi username atau kata sandi. Keduanya dibuat otomatis.
      </p>
    </form>
  );
}
