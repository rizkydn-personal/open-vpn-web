const WIB = "Asia/Jakarta";
const DAY_MS = 24 * 60 * 60 * 1000;

export function wibDay(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function nextResetAt(now: Date): Date {
  const [year, month, day] = wibDay(now).split("-").map(Number);
  // Jakarta is UTC+07:00 year round; 17:00 UTC on this calendar day is 00:00 WIB tomorrow.
  return new Date(Date.UTC(year, month - 1, day, 17, 0, 0, 0));
}

export function formatWib(iso: string | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  return `${new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB, day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date)} WIB`;
}

export function countdownToReset(now: Date): { hours: number; minutes: number; seconds: number } {
  const remaining = Math.max(0, nextResetAt(now).getTime() - now.getTime());
  const seconds = Math.floor(remaining / 1000);
  return { hours: Math.floor(seconds / 3600), minutes: Math.floor((seconds % 3600) / 60), seconds: seconds % 60 };
}

export const WIB_DAY_MS = DAY_MS;
