"use client";

import { useEffect, useState } from "react";

function formatCountdown(resetsAt: string, now: number): string | null {
  const target = Date.parse(resetsAt);
  if (!Number.isFinite(target)) return null;
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

// Hitung mundur reset kuota yang terisolasi: interval 1 detik hanya me-render
// komponen kecil ini, bukan seluruh halaman.
export function QuotaCountdown({ resetsAt }: { resetsAt?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = resetsAt && now !== null ? formatCountdown(resetsAt, now) : null;
  return (
    <span
      style={{
        display: "inline-block",
        fontVariantNumeric: "tabular-nums",
        background: "var(--surface-tint)",
        borderRadius: "var(--radius-pill)",
        padding: "0.25rem 0.75rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--ink)",
      }}
    >
      Reset 00.00 WIB
      {remaining ? `, tersisa ${remaining}` : ", waktunya belum bisa dipastikan"}
    </span>
  );
}
