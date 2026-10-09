"use client";

import type { CSSProperties } from "react";
import type { Meta } from "@/components/Portal";
import { quotaForDuration } from "@/components/quota";

function quotaLabel(
  quota: ReturnType<typeof quotaForDuration>,
  quotaUnavailable: boolean,
): string {
  if (quotaUnavailable || !quota) return "Kuota belum tersedia";
  if (quota.remaining <= 0) return "Kuota hari ini habis";
  return `Sisa ${quota.remaining} dari ${quota.limit}`;
}

const cardBase: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  padding: "1rem",
  transition:
    "border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.2s ease",
};

const cardActive: CSSProperties = {
  border: "2px solid var(--primary)",
  background:
    "color-mix(in srgb, var(--primary) 8%, var(--surface))",
  boxShadow: "var(--shadow-soft)",
  // 2px border diganti dengan 1px padding supaya ukuran kartu tetap sama
  padding: "calc(1rem - 1px)",
};

const quotaPill: CSSProperties = {
  display: "inline-block",
  justifySelf: "start",
  borderRadius: "var(--radius-pill)",
  background: "var(--surface-tint)",
  color: "var(--muted)",
  fontSize: "0.78rem",
  fontWeight: 600,
  padding: "0.2rem 0.65rem",
};

const barTrack: CSSProperties = {
  marginTop: "0.35rem",
  height: "0.5rem",
  borderRadius: "var(--radius-pill)",
  background: "var(--surface-tint)",
  overflow: "hidden",
};

// Tiga kartu durasi, masing-masing menampilkan sisa kuota hari ini.
// Dibangun di atas radio agar tetap dapat dipakai keyboard dan pembaca layar.
export function DurationCards({
  days,
  selected,
  onSelect,
  meta,
  serviceId,
}: {
  days: Array<1 | 3 | 7>;
  selected: 1 | 3 | 7;
  onSelect: (day: 1 | 3 | 7) => void;
  meta: Meta;
  serviceId: string;
}) {
  const quotaUnavailable = meta.quotaUnavailable ?? false;
  return (
    <fieldset className="duration-cards">
      <legend>Pilih durasi akunmu</legend>
      <div className="duration-cards__grid">
        {days.map((day) => {
          const quota = quotaForDuration(meta.quota, serviceId, day);
          const exhausted = !quotaUnavailable && quota ? quota.remaining <= 0 : false;
          const active = selected === day;
          const fill =
            quota && !quotaUnavailable && quota.limit > 0
              ? Math.min(100, Math.max(0, (quota.used / quota.limit) * 100))
              : 0;
          return (
            <label
              key={day}
              className={`duration-card${active ? " duration-card--active" : ""}${exhausted ? " duration-card--exhausted" : ""}`}
              style={active ? { ...cardBase, ...cardActive } : cardBase}
            >
              <input
                type="radio"
                name="days"
                value={day}
                checked={active}
                disabled={quotaUnavailable || exhausted}
                onChange={() => onSelect(day)}
                aria-label={`${day} hari`}
              />
              <span
                className="duration-card__days"
                aria-hidden="true"
                style={{ color: "var(--ink)", fontWeight: 750 }}
              >
                {day} hari
              </span>
              <span className="duration-card__quota" style={quotaPill}>
                {quotaLabel(quota, quotaUnavailable)}
              </span>
              {quota && !quotaUnavailable && quota.remaining > 0 ? (
                <div
                  role="progressbar"
                  aria-label={`Kuota ${day} hari terpakai ${quota.used} dari ${quota.limit}`}
                  aria-valuemin={0}
                  aria-valuemax={quota.limit}
                  aria-valuenow={quota.used}
                  style={barTrack}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      height: "100%",
                      width: `${fill}%`,
                      borderRadius: "var(--radius-pill)",
                      background: "var(--primary)",
                    }}
                  />
                </div>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
