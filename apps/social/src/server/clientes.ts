"use server";

import { clientes, db, destinations, videoRenders } from "@scrapify/db";
import { createClient } from "@supabase/supabase-js";
import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Extrae el path dentro del bucket "videos" desde una URL pública. */
function pathDeUrl(url: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf("/videos/");
  return i === -1 ? null : url.slice(i + "/videos/".length);
}

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
  const [row] = await db
    .insert(clientes)
    .values({ nombre: n, notas: notas?.trim() || null })
    .returning({ id: clientes.id });
  await registrar({
    accion: "cliente.crear",
    entidad: "cliente",
    entidadId: row?.id,
    resumen: `Creó el cliente "${n}"`,
  });
  revalidatePath("/clientes");
}

export async function actualizarCliente(id: string, nombre: string, notas?: string) {
  const n = nombre.trim();
  if (!n) throw new Error("El nombre es obligatorio.");
  await db
    .update(clientes)
    .set({ nombre: n, notas: notas?.trim() || null, updatedAt: new Date() })
    .where(eq(clientes.id, id));
  await registrar({
    accion: "cliente.editar",
    entidad: "cliente",
    entidadId: id,
    resumen: `Editó el cliente "${n}"`,
  });
  revalidatePath("/clientes");
}

export async function toggleClienteActivo(id: string, activo: boolean) {
  await db
    .update(clientes)
    .set({ activo, updatedAt: new Date() })
    .where(eq(clientes.id, id));
  revalidatePath("/clientes");
}

/**
 * Borra el cliente y TODO su contenido: sus renders (filas + archivos de Storage)
 * y, en cascada, sus cuentas de redes y publicaciones. Irreversible.
 */
export async function eliminarCliente(id: string) {
  const [cli] = await db
    .select({ nombre: clientes.nombre })
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  // 1) Archivos de Storage de los renders del cliente (original, resultado, miniatura).
  const renders = await db
    .select({
      sourcePath: videoRenders.sourcePath,
      outputPath: videoRenders.outputPath,
      thumbnailUrl: videoRenders.thumbnailUrl,
    })
    .from(videoRenders)
    .where(eq(videoRenders.clienteId, id));

  const paths = new Set<string>();
  for (const r of renders) {
    if (r.sourcePath) paths.add(r.sourcePath);
    if (r.outputPath) paths.add(r.outputPath);
    const tp = pathDeUrl(r.thumbnailUrl);
    if (tp) paths.add(tp);
  }
  if (paths.size > 0) {
    const sb = admin();
    const arr = [...paths];
    for (let i = 0; i < arr.length; i += 100) {
      try {
        await sb.storage.from("videos").remove(arr.slice(i, i + 100));
      } catch {
        // un archivo que ya no está no debe frenar el borrado del cliente
      }
    }
  }

  // 2) Borrar las filas de renders (su FK al cliente es set null, no se borran solas).
  await db.delete(videoRenders).where(eq(videoRenders.clienteId, id));

  // 3) Borrar el cliente → cascada de cuentas (social_accounts) y publicaciones.
  await db.delete(clientes).where(eq(clientes.id, id));

  await registrar({
    accion: "cliente.eliminar",
    entidad: "cliente",
    entidadId: id,
    resumen: `Eliminó el cliente "${cli?.nombre ?? id}" y todo su contenido`,
    meta: { renders: renders.length },
  });

  revalidatePath("/clientes");
  revalidatePath("/renders");
  revalidatePath("/publicaciones");
}
