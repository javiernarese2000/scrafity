"use server";

import { clientes, db, socialAccounts } from "@scrapify/db";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Plataforma = "instagram" | "facebook" | "tiktok";
export type EstadoCuenta = "conectada" | "desconectada" | "error";

export type CuentaRow = {
  id: string;
  plataforma: Plataforma;
  nombre: string;
  estado: EstadoCuenta;
};

export type ClienteConCuentas = {
  id: string;
  nombre: string;
  activo: boolean;
  cuentas: CuentaRow[];
};

/** Clientes con sus cuentas de redes anidadas (ordenado por nombre). */
export async function listarCuentasPorCliente(): Promise<ClienteConCuentas[]> {
  const cs = await db
    .select({ id: clientes.id, nombre: clientes.nombre, activo: clientes.activo })
    .from(clientes)
    .orderBy(asc(clientes.nombre));
  const accs = await db.select().from(socialAccounts);
  return cs.map((c) => ({
    ...c,
    cuentas: accs
      .filter((a) => a.clienteId === c.id)
      .map((a) => ({
        id: a.id,
        plataforma: a.plataforma as Plataforma,
        nombre: a.nombre,
        estado: a.estado as EstadoCuenta,
      })),
  }));
}

export async function agregarCuenta(
  clienteId: string,
  plataforma: Plataforma,
  nombre: string,
) {
  const n = nombre.trim().replace(/^@/, "");
  if (!clienteId) throw new Error("Elegí un cliente.");
  if (!n) throw new Error("El usuario/handle es obligatorio.");
  await db.insert(socialAccounts).values({
    clienteId,
    plataforma,
    nombre: n,
    estado: "desconectada",
  });
  revalidatePath("/cuentas");
}

/** Mock de conexión hasta enchufar el OAuth real de Meta/TikTok. */
export async function toggleCuentaConexion(id: string, conectar: boolean) {
  await db
    .update(socialAccounts)
    .set({
      estado: conectar ? "conectada" : "desconectada",
      updatedAt: new Date(),
    })
    .where(eq(socialAccounts.id, id));
  revalidatePath("/cuentas");
}

export async function eliminarCuenta(id: string) {
  await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
  revalidatePath("/cuentas");
}
