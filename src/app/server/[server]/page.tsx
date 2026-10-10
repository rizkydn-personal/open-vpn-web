import { Portal } from "@/components/Portal";

export const dynamic = "force-dynamic";

// Shell instan. Verifikasi 404 dikerjakan layout segmen (src/app/server/layout.tsx).
export default async function ServerPage({ params }: { params: Promise<{ server: string }> }) {
  const { server } = await params;
  return <Portal key={server} serverId={server} />;
}
