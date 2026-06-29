import type { NextRequest } from "next/server";

/**
 * URL base PÚBLICA del request. Detrás de un proxy (Railway), `req.url` trae el
 * host interno del contenedor (localhost:8080); para los redirects hay que usar
 * el host reenviado (`x-forwarded-host`).
 */
export function baseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    req.nextUrl.protocol.replace(":", "") ??
    "https";
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}
