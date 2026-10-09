import { Portal } from "@/components/Portal";

// Beranda me-render shell instan. Data layanan, status, dan kuota dimuat sisi
// klien oleh Portal lewat /api/meta agar first paint tidak menunggu upstream.
export default function Home() {
  return <Portal />;
}
