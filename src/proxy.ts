import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce=Buffer.from(randomUUID()).toString("base64");
  const dev=process.env.NODE_ENV==="development";
  const csp=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev?" 'unsafe-eval'":""} https://challenges.cloudflare.com`,
    `style-src 'self' 'nonce-${nonce}'`,"img-src 'self' blob: data:","font-src 'self'","connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'","manifest-src 'self'",...(dev?[]:["upgrade-insecure-requests"])].join("; ");
  const requestHeaders=new Headers(request.headers); requestHeaders.set("x-nonce",nonce); requestHeaders.set("Content-Security-Policy",csp);
  const response=NextResponse.next({request:{headers:requestHeaders}}); response.headers.set("Content-Security-Policy",csp); response.headers.set("Cross-Origin-Opener-Policy","same-origin"); response.headers.set("Cross-Origin-Resource-Policy","same-origin"); response.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"); if(!dev) response.headers.set("Strict-Transport-Security","max-age=31536000; includeSubDomains"); return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
