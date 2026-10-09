"use client";

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
      <legend>Pilih durasi akun</legend>
      <div className="duration-cards__grid">
        {days.map((day) => {
          const quota = quotaForDuration(meta.quota, serviceId, day);
          const exhausted = !quotaUnavailable && quota ? quota.remaining <= 0 : false;
          const active = selected === day;
          return (
            <label
              key={day}
              className={`duration-card${active ? " duration-card--active" : ""}${exhausted ? " duration-card--exhausted" : ""}`}
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
              <span className="duration-card__days" aria-hidden="true">
                {day} hari
              </span>
              <span className="duration-card__quota">{quotaLabel(quota, quotaUnavailable)}</span>
              {quota && !quotaUnavailable && quota.remaining > 0 ? (
                <progress
                  value={quota.used}
                  max={quota.limit}
                  aria-label={`Kuota ${day} hari terpakai ${quota.used} dari ${quota.limit}`}
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
