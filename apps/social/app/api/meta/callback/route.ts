import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { baseUrl } from "@/lib/base-url";
import { exchangeCode, listPagesWithIg, longLivedToken } from "@/lib/meta";
import { conectarPaginas } from "@/server/meta";

export const dynamic = "force-dynamic";

function err(req: NextRequest, msg: string) {
  return NextResponse.redirect(
    new URL(`/cuentas?meta=error&msg=${encodeURIComponent(msg)}`, baseUrl(req)),
  );
}

/** Vuelve Meta acá con ?code&state. Intercambia, lista Páginas/IG y los conecta. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  if (sp.get("error")) {
    return err(req, sp.get("error_description") ?? sp.get("error")!);
  }

  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) return err(req, "Faltan parámetros de Meta.");

  let parsed: { c: string; n: string };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return err(req, "state inválido.");
  }

  const jar = await cookies();
  if (jar.get("meta_oauth")?.value !== parsed.n) {
    return err(req, "La sesión de conexión expiró. Probá de nuevo.");
  }
  jar.delete("meta_oauth");

  try {
    const short = await exchangeCode(code);
    const long = await longLivedToken(short);
    const pages = await listPagesWithIg(long);

    if (pages.length === 0) {
      return err(
        req,
        "No encontramos Páginas. Verificá que tu cuenta administre una Página de Facebook.",
      );
    }

    const { fb, ig } = await conectarPaginas(parsed.c, pages);
    return NextResponse.redirect(
      new URL(`/cuentas?meta=ok&fb=${fb}&ig=${ig}`, baseUrl(req)),
    );
  } catch (e) {
    return err(req, e instanceof Error ? e.message : "Error al conectar con Meta.");
  }
}
