import { notFound } from "next/navigation";
import { Portal } from "@/components/Portal";
import { initialMeta } from "@/lib/initialMeta";

export const dynamic = "force-dynamic";

export default async function ServerPage({ params }: { params: Promise<{ server: string }> }) {
  const { server } = await params;
  const meta = await initialMeta();
  if (meta.services.length > 0 && !meta.services.some((service) => service.server_id === server))
    notFound();
  return <Portal key={server} initial={meta} serverId={server} />;
}
