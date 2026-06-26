"use server";

import { clientes, db, destinations } from "@scrapify/db";
import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ClienteRow = {
  id: string;
  nombre: string;
  notas: string | null;
  activo: boolean;
  destinos: number;
};

/** Lista los clientes con la cantidad de destinos asociados. */
export async function listarClientes(): Promise<ClienteRow[]> {
  return db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      notas: clientes.notas,
      activo: clientes.activo,
      destinos: sql<number>`count(${destinations.id})::int`,
    })
    .from(clientes)
    .leftJoin(destinations, eq(destinations.clienteId, clientes.id))
    .groupBy(clientes.id)
    .orderBy(desc(clientes.createdAt));
}

export async function crearCliente(nombre: string, notas?: string) {
  const n = nombre.trim();
  if (!n) throw new Error("El nombre es obligatorio.");
  await db.insert(clientes).values({ nombre: n, notas: notas?.trim() || null });
  revalidatePath("/clientes");
}

export async function actualizarCliente(id: string, nombre: string, notas?: string) {
  const n = nombre.trim();
  if (!n) throw new Error("El nombre es obligatorio.");
  await db
    .update(clientes)
    .set({ nombre: n, notas: notas?.trim() || null, updatedAt: new Date() })
    .where(eq(clientes.id, id));
  revalidatePath("/clientes");
}

export async function toggleClienteActivo(id: string, activo: boolean) {
  await db
    .update(clientes)
    .set({ activo, updatedAt: new Date() })
    .where(eq(clientes.id, id));
  revalidatePath("/clientes");
}

export async function eliminarCliente(id: string) {
  await db.delete(clientes).where(eq(clientes.id, id));
  revalidatePath("/clientes");
}
