"use server";

import { clientes, db, socialAccounts } from "@scrapify/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";
import { encrypt } from "@/lib/crypto";
import type { MetaPage } from "@/lib/meta";
import type { Plataforma } from "@/server/cuentas";

/** Crea o actualiza una cuenta conectada (idempotente por cliente+plataforma+externalId). */
async function upsertCuenta(
  clienteId: string,
  plataforma: Plataforma,
  externalId: string,
  nombre: string,
  token: string,
) {
  const [exist] = await db
    .select({ id: socialAccounts.id })
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.clienteId, clienteId),
        eq(socialAccounts.plataforma, plataforma),
        eq(socialAccounts.externalId, externalId),
      ),
    )
    .limit(1);

  const datos = {
    nombre,
    estado: "conectada" as const,
    credencialesCifradas: encrypt(token),
    expiraEn: null,
    updatedAt: new Date(),
  };

  if (exist) {
    await db.update(socialAccounts).set(datos).where(eq(socialAccounts.id, exist.id));
  } else {
    await db
      .insert(socialAccounts)
      .values({ clienteId, plataforma, externalId, ...datos });
  }
}

/**
 * Conecta todas las Páginas (y su IG vinculado) al cliente. El token de Página
 * sirve para publicar tanto en FB como en el IG Business asociado.
 */
export async function conectarPaginas(
  clienteId: string,
  pages: MetaPage[],
): Promise<{ fb: number; ig: number }> {
  let fb = 0;
  let ig = 0;
  for (const p of pages) {
    await upsertCuenta(clienteId, "facebook", p.id, p.name, p.accessToken);
    fb++;
    if (p.ig) {
      await upsertCuenta(clienteId, "instagram", p.ig.id, p.ig.username, p.accessToken);
      ig++;
    }
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
    resumen: `Conectó Meta a "${cli?.nombre ?? clienteId}": ${fb} Página(s) y ${ig} IG`,
    meta: { fb, ig },
  });

  revalidatePath("/cuentas");
  return { fb, ig };
}
