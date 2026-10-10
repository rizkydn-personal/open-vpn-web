import type { CSSProperties } from "react";
import type { ServerHealth } from "@/lib/serverDirectory";

function label(health: ServerHealth, available?: number): string {
  if (health === "online") {
    if (available === undefined) return "Online";
    return available > 0 ? "Online / Tersedia" : "Online / Layanan tidak tersedia";
  }
  return health === "stale" ? "Status terakhir diketahui" : "Status belum tersedia";
}

// Pill kecil: dot + teks, tanpa kapsul berat. Inline style agar konsisten di semua
// pemakai (ServerServices, ServerDirectory) tanpa menyentuh file lain.
const PILL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.375rem",
  padding: "0.22rem 0.65rem",
  borderRadius: "var(--radius-pill, 999px)",
  fontSize: "0.75rem",
  fontWeight: 600,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

const DOT: CSSProperties = {
  width: "0.45rem",
  height: "0.45rem",
  flex: "none",
  borderRadius: "50%",
  background: "currentColor",
};

const VARIANTS: Record<ServerHealth, CSSProperties> = {
  online: {
    background: "var(--surface-tint, #eaf3f8)",
    color: "var(--primary, #0866b5)",
  },
  stale: {
    background: "color-mix(in srgb, var(--warm, #f2c438) 16%, var(--surface, #ffffff))",
    color: "var(--ink, #183345)",
  },
  unknown: {
    background: "var(--surface, #ffffff)",
    border: "1px solid var(--line, #dfe5ea)",
    color: "var(--muted, #526573)",
  },
};

const UNKNOWN_DOT: CSSProperties = {
  ...DOT,
  background: "transparent",
  boxShadow: "inset 0 0 0 2px currentColor",
};

export function ServerStatusBadge({
  health,
  available,
}: {
  health: ServerHealth;
  available?: number;
}) {
  return (
    <span className={`status-badge status-badge--${health}`} style={{ ...PILL, ...VARIANTS[health] }}>
      <span
        className="status-badge__dot"
        aria-hidden="true"
        style={health === "unknown" ? UNKNOWN_DOT : DOT}
      />
      {label(health, available)}
    </span>
  );
}
