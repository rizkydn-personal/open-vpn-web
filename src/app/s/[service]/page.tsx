import { notFound } from "next/navigation";
import { Portal } from "@/components/Portal";
import { initialMeta } from "@/lib/initialMeta";
export const dynamic = "force-dynamic";
export default async function ServicePage({params}:{params:Promise<{service:string}>}) { const {service}=await params; const meta=await initialMeta(); if(!meta.unavailable && meta.services.length > 0 && !meta.services.some(item=>item.id===service)) notFound(); return <Portal key={service} initial={meta} serviceId={service}/>; }
