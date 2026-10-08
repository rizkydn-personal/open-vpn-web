import { Portal } from "@/components/Portal";
import { initialMeta } from "@/lib/initialMeta";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Portal initial={await initialMeta()} />;
}
