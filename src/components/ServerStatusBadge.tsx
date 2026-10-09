import type { ServerHealth } from "@/lib/serverDirectory";

function label(health: ServerHealth, available?: number): string {
  if (health === "online") {
    if (available === undefined) return "Online";
    return available > 0 ? "Online / Tersedia" : "Online / Layanan tidak tersedia";
  }
  return health === "stale" ? "Status terakhir diketahui" : "Status belum tersedia";
}

export function ServerStatusBadge({
  health,
  available,
}: {
  health: ServerHealth;
  available?: number;
}) {
  return (
    <span className={`status-badge status-badge--${health}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {label(health, available)}
    </span>
  );
}
