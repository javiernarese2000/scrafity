"use server";

import { clientes, db, socialAccounts } from "@scrapify/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";
import { encrypt } from "@/lib/crypto";
import type { TikTokCreds, TikTokTokens } from "@/lib/tiktok";

export async function conectarTikTok(
  clienteId: string,
  tokens: TikTokTokens,
  nombre: string,
): Promise<void> {
  const creds: TikTokCreds = {
    a: tokens.access_token,
    r: tokens.refresh_token,
    exp: Date.now() + tokens.expires_in * 1000,
  };
  const datos = {
    nombre,
    estado: "conectada" as const,
    credencialesCifradas: encrypt(JSON.stringify(creds)),
    expiraEn: new Date(creds.exp),
    updatedAt: new Date(),
  };

  const [exist] = await db
    .select({ id: socialAccounts.id })
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.clienteId, clienteId),
        eq(socialAccounts.plataforma, "tiktok"),
        eq(socialAccounts.externalId, tokens.open_id),
      ),
    )
    .limit(1);

  if (exist) {
    await db.update(socialAccounts).set(datos).where(eq(socialAccounts.id, exist.id));
  } else {
    await db.insert(socialAccounts).values({
      clienteId,
      plataforma: "tiktok",
      externalId: tokens.open_id,
      ...datos,
    });
  }

  const [cli] = await db
    .select({ nombre: clientes.nombre })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);
  await registrar({
    accion: "cuenta.conectar",
    entidad: "cliente",
    entidadId: clienteId,
    resumen: `Conectó TikTok (@${nombre}) a "${cli?.nombre ?? clienteId}"`,
  });

  revalidatePath("/cuentas");
}
