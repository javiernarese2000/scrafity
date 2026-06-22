"use server";

import { db, destinations } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type DestinoTipo = "wordpress_cliente" | "sitio_propio";

export async function createDestino(input: {
  nombre: string;
  tipo: DestinoTipo;
  endpoint: string;
}) {
  await db.insert(destinations).values({
    nombre: input.nombre,
    tipo: input.tipo,
    configApi: { url: input.endpoint },
  });
  revalidatePath("/destinos");
}

export async function deleteDestino(id: string) {
  await db.delete(destinations).where(eq(destinations.id, id));
  revalidatePath("/destinos");
}
