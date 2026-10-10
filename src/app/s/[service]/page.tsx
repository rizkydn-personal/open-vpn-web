import { Portal } from "@/components/Portal";

export const dynamic = "force-dynamic";

// Shell instan. Verifikasi 404 dikerjakan layout segmen (src/app/s/layout.tsx)
// agar status HTTP 404 tetap benar meski ada loading.tsx.
export default async function ServicePage({
  params,
}: {
  params: Promise<{ service: string }>;
}) {
  const { service } = await params;
  return <Portal key={service} serviceId={service} />;
}
