"use client";
import { useEffect, useRef, useState } from "react";
import type { Service, CreatedAccount } from "@/lib/vpnApi";
import { CopyButton } from "@/components/CopyButton";
import { formatWib } from "@/lib/time";
import { translateClientError } from "@/lib/clientErrors";
type Quota={used:number;limit:number;remaining:number;resetsAt:string};
function textValue(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : Array.isArray(value) ? value.map(textValue).join(", ") : typeof value === "object" && value ? JSON.stringify(value) : ""; }
declare global { interface Window { turnstile?: { render:(target:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void})=>string; reset:(id?:string)=>void } } }
export function AccountForm({service,days,quota,turnstileSiteKey,embedded=false}:{service:Service;days:Array<1|3|7>;quota?:Quota;turnstileSiteKey?:string;embedded?:boolean}) {
  const [selected,setSelected]=useState<1|3|7>(days[0]??1); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [result,setResult]=useState<CreatedAccount|null>(null); const [token,setToken]=useState(""); const widget=useRef<HTMLDivElement>(null); const widgetId=useRef<string|undefined>(undefined);
  const resultKey=`open-vpn-web:account-result:${service.id}`;
  useEffect(()=>{ try { const saved=sessionStorage.getItem(resultKey); if(saved) setResult(JSON.parse(saved) as CreatedAccount); } catch { sessionStorage.removeItem(resultKey); } },[resultKey]);
  useEffect(()=>{ try { if(result) sessionStorage.setItem(resultKey,JSON.stringify(result)); else sessionStorage.removeItem(resultKey); } catch { /* Storage may be disabled. */ } },[result,resultKey]);
  useEffect(()=>{if(!turnstileSiteKey||!widget.current)return;let cancelled=false;const render=()=>{if(!cancelled&&window.turnstile&&widget.current&&!widgetId.current)widgetId.current=window.turnstile.render(widget.current,{sitekey:turnstileSiteKey,callback:setToken,"expired-callback":()=>setToken(""),"error-callback":()=>setToken("")});};
    let script=document.querySelector<HTMLScriptElement>("script[data-turnstile]");if(window.turnstile)render();else if(!script){script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.defer=true;script.dataset.turnstile="true";script.addEventListener("load",render);document.head.append(script);}else script.addEventListener("load",render);
    return()=>{cancelled=true;script?.removeEventListener("load",render);if(widgetId.current){window.turnstile?.reset(widgetId.current);widgetId.current=undefined;}};},[turnstileSiteKey]);
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(turnstileSiteKey&&!token){setError("Selesaikan verifikasi keamanan terlebih dahulu.");return;}
    setBusy(true);setError("");
    try{
      const headers:Record<string,string>={"Content-Type":"application/json"};
      if(token)headers["cf-turnstile-response"]=token;
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 45000);
      
      let response;
      try {
        response=await fetch("/api/accounts",{method:"POST",headers,body:JSON.stringify({service:service.id,days:selected}), signal: controller.signal});
      } catch (err: any) {
        if (err.name === 'AbortError') {
           setError(translateClientError("timeout"));
           return;
        }
        setError(translateClientError("network_error"));
        return;
      } finally {
        clearTimeout(id);
      }
      
      let payload;
      let isJson = false;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try { payload=await response.json(); isJson = true; } catch {}
      }

      const status = response.status;
      if(!response.ok) {
         let code = "unknown";
         let retryMin = 5;
         if (isJson && payload?.error?.code) {
           code = payload.error.code;
         } else if (status === 413) code = "payload_too_large";
         else if (status === 415) code = "unsupported_media_type";
         
         const retryAfter = response.headers.get("retry-after");
         if (retryAfter) {
            retryMin = Math.ceil(parseInt(retryAfter, 10) / 60) || 5;
         }

         setError(translateClientError(code, status, { serviceName: service.label, retryMinutes: retryMin }));
         return;
      }
      
      if (!isJson) {
         setError(translateClientError("unknown", status));
         return;
      }
      
      setResult(payload.data);
    }catch(e){
      setError(translateClientError("unknown"));
    }finally{
      setBusy(false);
      if(turnstileSiteKey){
        setToken("");
        if(widgetId.current)window.turnstile?.reset(widgetId.current);
      }
    }
  }
  if(result) return <section className="panel result-card" aria-live="polite"><h2>Akun berhasil dibuat</h2><p className="notice">Simpan sekarang — data ini tidak disimpan di situs ini.</p><p><strong>Username:</strong> {result.username} <CopyButton value={result.username}/></p><p><strong>Berlaku sampai:</strong> {formatWib(result.expires_at)}</p><Connection data={result.connection}/><button className="button-secondary" onClick={()=>setResult(null)}>Buat lagi</button></section>;
  return <form className={embedded?"create-form create-form--embedded":"panel create-form"} onSubmit={submit}><h2>Buat akun</h2><fieldset><legend>Pilih durasi</legend><div className="duration-options">{days.map(day=><label key={day} className={selected===day?"duration-option selected":"duration-option"}><input type="radio" name="days" value={day} checked={selected===day} onChange={()=>setSelected(day)}/><span>{day} hari</span></label>)}</div></fieldset>
    {turnstileSiteKey&&<div className="turnstile"><div ref={widget} aria-label="Verifikasi keamanan"/></div>}{quota?.remaining===0&&<p className="form-error">Kuota hari ini habis. Reset 00.00 WIB.</p>}{error&&<p className="form-error" role="alert">{error}</p>}<button className="button-primary" disabled={busy||quota?.remaining===0} type="submit">{busy?"Membuat akun…":"Buat Akun"}</button><p className="muted">Username dibuat otomatis. Kata sandi tidak diperlukan.</p></form>;
}
function Connection({data}:{data:Record<string,unknown>}){
 const entries=Object.entries(data);return <div className="connection"><h3>Detail koneksi</h3>{entries.map(([key,value])=>{
   if(key==="content"&&typeof value==="string"){const filename=typeof data.filename==="string"?data.filename:"config.ovpn";return <div className="connection-row" key={key}><span>{filename}</span><button className="copy-button" onClick={()=>{const url=URL.createObjectURL(new Blob([value],{type:"application/octet-stream"}));const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Unduh</button></div>;}
   if(key==="filename")return null;
   if(key==="links"&&value&&typeof value==="object") return Object.entries(value).map(([label,url])=><div className="connection-row" key={`link-${label}`}><span>{label}: {textValue(url)}</span><CopyButton value={textValue(url)}/></div>);
   const shown=textValue(value);return shown?<div className="connection-row" key={key}><span><strong>{key.replaceAll("_"," ")}:</strong> {shown}</span><CopyButton value={shown}/></div>:null;
 })}</div>;
}
