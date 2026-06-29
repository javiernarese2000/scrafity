import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { exchangeCode, getUserInfo } from "@/lib/tiktok";
import { conectarTikTok } from "@/server/tiktok";

export const dynamic = "force-dynamic";

function err(req: NextRequest, msg: string) {
  return NextResponse.redirect(
    new URL(`/cuentas?tt=error&msg=${encodeURIComponent(msg)}`, req.url),
  );
}

/** Vuelve TikTok acá con ?code&state. Intercambia, trae el perfil y conecta la cuenta. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  if (sp.get("error")) {
    return err(req, sp.get("error_description") ?? sp.get("error")!);
  }

  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) return err(req, "Faltan parámetros de TikTok.");

  let parsed: { c: string; n: string };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return err(req, "state inválido.");
  }

  const jar = await cookies();
  if (jar.get("tiktok_oauth")?.value !== parsed.n) {
    return err(req, "La sesión de conexión expiró. Probá de nuevo.");
  }
  jar.delete("tiktok_oauth");

  try {
    const tokens = await exchangeCode(code);
    const { nombre } = await getUserInfo(tokens.access_token);
    await conectarTikTok(parsed.c, tokens, nombre);
    return NextResponse.redirect(new URL("/cuentas?tt=ok", req.url));
  } catch (e) {
    return err(req, e instanceof Error ? e.message : "Error al conectar TikTok.");
  }
}
