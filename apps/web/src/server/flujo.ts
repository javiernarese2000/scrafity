"use server";

import {
  db,
  escenarioDestinos,
  escenarioFuentes,
  escenarios,
  nodePositions,
} from "@scrapify/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { EscenarioConfig } from "@/components/escenarios/types";

export async function crearEscenario(): Promise<{ id: string }> {
  const existentes = await db.select({ id: escenarios.id }).from(escenarios);
  const [e] = await db
    .insert(escenarios)
    .values({ nombre: "Nuevo escenario" })
    .returning();
  await db.insert(nodePositions).values({
    key: `escenario:${e!.id}`,
    x: 480,
    y: 60 + existentes.length * 160,
  });
  revalidatePath("/escenarios");
  return { id: e!.id };
}

export async function actualizarEscenario(
  id: string,
  data: Partial<EscenarioConfig>,
) {
  await db
    .update(escenarios)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(escenarios.id, id));
  revalidatePath("/escenarios");
}

export async function eliminarEscenario(id: string) {
  await db.delete(escenarios).where(eq(escenarios.id, id));
  await db
    .delete(nodePositions)
    .where(eq(nodePositions.key, `escenario:${id}`));
  revalidatePath("/escenarios");
}

export async function conectar(
  escenarioId: string,
  lado: "fuente" | "destino",
  refId: string,
) {
  if (lado === "fuente") {
    await db
      .insert(escenarioFuentes)
      .values({ escenarioId, sourceId: refId })
      .onConflictDoNothing();
  } else {
    await db
      .insert(escenarioDestinos)
      .values({ escenarioId, destinationId: refId })
      .onConflictDoNothing();
  }
  revalidatePath("/escenarios");
}

export async function desconectar(
  escenarioId: string,
  lado: "fuente" | "destino",
  refId: string,
) {
  if (lado === "fuente") {
    await db
      .delete(escenarioFuentes)
      .where(
        and(
          eq(escenarioFuentes.escenarioId, escenarioId),
          eq(escenarioFuentes.sourceId, refId),
        ),
      );
  } else {
    await db
      .delete(escenarioDestinos)
      .where(
        and(
          eq(escenarioDestinos.escenarioId, escenarioId),
          eq(escenarioDestinos.destinationId, refId),
        ),
      );
  }
  revalidatePath("/escenarios");
}

export async function setEdgeKeywords(
  escenarioId: string,
  lado: "fuente" | "destino",
  refId: string,
  keywords: string[],
) {
  if (lado === "fuente") {
    await db
      .update(escenarioFuentes)
      .set({ keywords })
      .where(
        and(
          eq(escenarioFuentes.escenarioId, escenarioId),
          eq(escenarioFuentes.sourceId, refId),
        ),
      );
  } else {
    await db
      .update(escenarioDestinos)
      .set({ keywords })
      .where(
        and(
          eq(escenarioDestinos.escenarioId, escenarioId),
          eq(escenarioDestinos.destinationId, refId),
        ),
      );
  }
  revalidatePath("/escenarios");
}

export async function guardarPosicion(key: string, x: number, y: number) {
  await db
    .insert(nodePositions)
    .values({ key, x, y })
    .onConflictDoUpdate({ target: nodePositions.key, set: { x, y } });
}
