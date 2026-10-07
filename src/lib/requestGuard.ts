

export async function checkRequestGuard(request: Request, bodyText?: string): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> {
  // 1. Check Content-Type
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { ok: false, status: 415, code: "unsupported_media_type", message: "Content-Type must be application/json" };
  }

  // 2. Check Origin / Sec-Fetch-Site
  const secFetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || "";

  if (secFetchSite) {
    if (secFetchSite !== "same-origin") {
      return { ok: false, status: 403, code: "forbidden_origin", message: "Cross-origin requests are not allowed" };
    }
  } else if (origin) {
    try {
      const originUrl = new URL(origin);
      // We check if the host in origin matches the host header
      // This is a naive check. A better check is verifying if the host matches.
      // But we just compare host strings.
      if (originUrl.host !== host) {
         return { ok: false, status: 403, code: "forbidden_origin", message: "Cross-origin requests are not allowed" };
      }
    } catch {
      return { ok: false, status: 403, code: "forbidden_origin", message: "Invalid origin" };
    }
  } else {
    // Both missing. Allow if not production, otherwise reject.
    if (process.env.NODE_ENV === "production") {
      // In production, we require browser headers or explicit non-browser bypass.
      // For this app, only browsers should hit this endpoint (has turnstile).
      return { ok: false, status: 403, code: "forbidden_origin", message: "Missing origin headers in production" };
    }
  }

  // 3. Check Content-Length and actual size
  const contentLengthStr = request.headers.get("content-length");
  if (contentLengthStr) {
    const len = parseInt(contentLengthStr, 10);
    if (len > 2048) {
      return { ok: false, status: 413, code: "payload_too_large", message: "Payload too large" };
    }
  }
  
  if (bodyText !== undefined && bodyText.length > 2048) {
    return { ok: false, status: 413, code: "payload_too_large", message: "Payload too large" };
  }

  return { ok: true };
}
