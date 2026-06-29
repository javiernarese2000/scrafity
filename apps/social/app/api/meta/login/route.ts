import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { authUrl } from "@/lib/meta";

export const dynamic = "force-dynamic";

/** Arranca el login de Meta para un cliente. /api/meta/login?cliente=<id> */
export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente") ?? "";
  if (!clienteId) {
    return NextResponse.redirect(new URL("/cuentas?meta=error&msg=Falta+el+cliente", req.url));
  }

  // state = {cliente, nonce} (base64url); el nonce se verifica con la cookie (CSRF).
  const nonce = randomUUID();
  const state = Buffer.from(JSON.stringify({ c: clienteId, n: nonce })).toString(
    "base64url",
  );

  const jar = await cookies();
  jar.set("meta_oauth", nonce, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(authUrl(state));
}
