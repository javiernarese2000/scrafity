"use server";

import { ajustes, type AjustesConfig, db } from "@scrapify/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const DEFAULTS: AjustesConfig = {
  similitudObjetivo: 0.4,
  maxPorFuente: 10,
  retencionDias: 60,
  papeleraDias: 14,
};

/** Config global con fallback a los defaults. Usado por el motor y el cron. */
export async function getAjustes(): Promise<AjustesConfig> {
  const [row] = await db
    .select()
    .from(ajustes)
    .where(eq(ajustes.id, "global"))
    .limit(1);
  return { ...DEFAULTS, ...(row?.config ?? {}) };
}

export async function guardarAjustes(config: AjustesConfig) {
  const limpio: AjustesConfig = {
    similitudObjetivo: Math.min(0.9, Math.max(0.1, config.similitudObjetivo)),
    maxPorFuente: Math.max(1, Math.round(config.maxPorFuente)),
    retencionDias: Math.max(1, Math.round(config.retencionDias)),
    papeleraDias: Math.max(1, Math.round(config.papeleraDias)),
  };
  await db
    .insert(ajustes)
    .values({ id: "global", config: limpio })
    .onConflictDoUpdate({
      target: ajustes.id,
      set: { config: limpio, updatedAt: new Date() },
    });
  revalidatePath("/ajustes");
}

/** Estado de las claves de IA (se cargan en el server, en .env). */
export async function estadoProveedores(): Promise<{
  claude: boolean;
  deepseek: boolean;
}> {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
  };
}
