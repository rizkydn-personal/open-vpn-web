"use client";
import { useEffect, useRef, useState } from "react";
import type { Service, CreatedAccount } from "@/lib/vpnApi";
import { CopyButton } from "@/components/CopyButton";
import { formatWib } from "@/lib/time";
import { clientErrorMessage } from "@/lib/clientErrors";
import { readStoredAccount, writeStoredAccount } from "@/lib/accountStorage";

type Quota = { used: number; limit: number; remaining: number; resetsAt: string };
function textValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : Array.isArray(value)
      ? value.map(textValue).join(", ")
      : typeof value === "object" && value
        ? JSON.stringify(value)
        : "";
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
export function AccountForm({
  service,
  days,
  quota,
  turnstileSiteKey,
  embedded = false,
}: {
  service: Service;
  days: Array<1 | 3 | 7>;
  quota?: Quota;
  turnstileSiteKey?: string;
  embedded?: boolean;
}) {
  const [selected, setSelected] = useState<1 | 3 | 7>(days[0] ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreatedAccount | null>(null);
  const [token, setToken] = useState("");
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const resultKey = `open-vpn-web:account-result:${service.id}`;
  useEffect(() => {
    try {
      const account = readStoredAccount(sessionStorage, resultKey);
      if (account) setResult(account);
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
        body: JSON.stringify({ service: service.id, days: selected }),
        signal: controller.signal,
      });
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }
      const data = payload as { error?: { code?: string }; data?: CreatedAccount };
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
  if (result)
    return (
      <section className="panel result-card" aria-live="polite">
        <h2>Akun berhasil dibuat</h2>
        <p className="notice">Simpan sekarang — data ini tidak disimpan di situs ini.</p>
        <p>
          <strong>Username:</strong> {result.username} <CopyButton value={result.username} />
        </p>
        <p>
          <strong>Berlaku sampai:</strong> {formatWib(result.expires_at)}
        </p>
        <Connection data={result.connection} />
        <button className="button-secondary" onClick={() => setResult(null)}>
          Buat lagi
        </button>
      </section>
    );
  return (
    <form
      className={embedded ? "create-form create-form--embedded" : "panel create-form"}
      onSubmit={submit}
    >
      <h2>Buat akun</h2>
      <fieldset>
        <legend>Pilih durasi</legend>
        <div className="duration-options">
          {days.map((day) => (
            <label
              key={day}
              className={selected === day ? "duration-option selected" : "duration-option"}
            >
              <input
                type="radio"
                name="days"
                value={day}
                checked={selected === day}
                onChange={() => setSelected(day)}
              />
              <span>{day} hari</span>
            </label>
          ))}
        </div>
      </fieldset>
      {turnstileSiteKey && (
        <div className="turnstile">
          <div ref={widget} aria-label="Verifikasi keamanan" />
        </div>
      )}
      {quota?.remaining === 0 && (
        <p className="form-error">Kuota hari ini habis. Reset 00.00 WIB.</p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button-primary"
        disabled={busy || quota?.remaining === 0 || Boolean(turnstileSiteKey && !token)}
        type="submit"
      >
        {busy ? "Membuat akun…" : "Buat Akun"}
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
function Connection({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  return (
    <div className="connection">
      <h3>Detail koneksi</h3>
      {entries.map(([key, value]) => {
        if (key === "content" && typeof value === "string") {
          const filename = typeof data.filename === "string" ? data.filename : "config.ovpn";
          return (
            <div className="connection-row" key={key}>
              <span>{filename}</span>
              <button
                className="copy-button"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([value], { type: "application/octet-stream" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Unduh
              </button>
            </div>
          );
        }
        if (key === "filename") return null;
        if (key === "links" && value && typeof value === "object")
          return Object.entries(value).map(([label, url]) => (
            <div className="connection-row" key={`link-${label}`}>
              <span>
                {label}: {textValue(url)}
              </span>
              <CopyButton value={textValue(url)} />
            </div>
          ));
        const shown = textValue(value);
        return shown ? (
          <div className="connection-row" key={key}>
            <span>
              <strong>{key.replaceAll("_", " ")}:</strong> {shown}
            </span>
            <CopyButton value={shown} />
          </div>
        ) : null;
      })}
    </div>
  );
}
