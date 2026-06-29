import { NextResponse, type NextRequest } from "next/server";

import { despachar } from "@/server/despachador";

export const dynamic = "force-dynamic";

/**
 * Despacha las publicaciones programadas que ya llegaron a su hora.
 * Pensado para un cron externo. Si está seteado CRON_SECRET, hay que pasar
 * ?key=<secret>. En dev (sin secret) queda abierto.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.nextUrl.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const r = await despachar();
  return NextResponse.json(r);
}
