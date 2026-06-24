"use server";

import { db, destinations } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { encrypt } from "@/lib/crypto";
import {
  listarCategoriasWp,
  parseCredenciales,
  probarConexionWp,
  type WpCategoria,
  type WpCredenciales,
} from "./wordpress";

export type DestinoTipo = "wordpress_cliente" | "sitio_propio";

export async function createDestino(input: {
  nombre: string;
  tipo: DestinoTipo;
  endpoint: string;
  // Solo para WordPress: usuario + contraseña de aplicación.
  username?: string;
  appPassword?: string;
}) {
  const esWp = input.tipo === "wordpress_cliente";
  const credencialesCifradas =
    esWp && input.username && input.appPassword
      ? encrypt(
          JSON.stringify({
            username: input.username,
            appPassword: input.appPassword,
          } satisfies WpCredenciales),
        )
      : null;

  await db.insert(destinations).values({
    nombre: input.nombre,
    tipo: input.tipo,
    configApi: { url: input.endpoint },
    credencialesCifradas,
  });
  revalidatePath("/destinos");
}

export async function deleteDestino(id: string) {
  await db.delete(destinations).where(eq(destinations.id, id));
  revalidatePath("/destinos");
}

/** Categorías de un destino WordPress (vacío si no es WP o si falla). */
export async function categoriasDeDestino(
  destinationId: string,
): Promise<WpCategoria[]> {
  const [d] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, destinationId))
    .limit(1);
  if (!d || d.tipo !== "wordpress_cliente") return [];
  try {
    const cfg = (d.configApi ?? {}) as { url?: string };
    if (!cfg.url) return [];
    return await listarCategoriasWp(cfg.url, parseCredenciales(d.credencialesCifradas));
  } catch {
    return [];
  }
}

/** Prueba credenciales de WordPress sin guardar nada. */
export async function probarConexion(input: {
  endpoint: string;
  username: string;
  appPassword: string;
}): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const r = await probarConexionWp(input.endpoint, {
      username: input.username,
      appPassword: input.appPassword,
    });
    return { ok: true, mensaje: `Conectado como ${r.usuario}` };
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "Falló la conexión" };
  }
}
