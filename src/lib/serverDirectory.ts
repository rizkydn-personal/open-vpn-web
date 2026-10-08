import type { Service } from "@/lib/vpnApi";

export type ServerGroup = { id: string; label: string; location?: string; services: Service[] };

export function groupServicesByServer(services: Service[]): ServerGroup[] {
  const groups = new Map<string, ServerGroup>();
  for (const service of services) {
    const id = service.server_id ?? "default";
    const group = groups.get(id) ?? {
      id,
      label: service.server_label ?? "Server utama",
      location: service.server_location,
      services: [],
    };
    group.services.push(service);
    groups.set(id, group);
  }
  return [...groups.values()];
}
