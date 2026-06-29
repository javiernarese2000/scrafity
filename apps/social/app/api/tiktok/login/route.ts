import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { baseUrl } from "@/lib/base-url";
import { authUrl } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

/** Arranca el login de TikTok para un cliente. /api/tiktok/login?cliente=<id> */
export async function GET(req: NextRequest) {
  try {
    const clienteId = req.nextUrl.searchParams.get("cliente") ?? "";
    if (!clienteId) {
      return NextResponse.redirect(
        new URL("/cuentas?tt=error&msg=Falta+el+cliente", baseUrl(req)),
      );
    }

    const nonce = randomUUID();
    const state = Buffer.from(
      JSON.stringify({ c: clienteId, n: nonce }),
    ).toString("base64url");

    const jar = await cookies();
    jar.set("tiktok_oauth", nonce, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return NextResponse.redirect(authUrl(state));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al iniciar TikTok.";
    return NextResponse.redirect(
      new URL(`/cuentas?tt=error&msg=${encodeURIComponent(msg)}`, baseUrl(req)),
    );
  }
}
