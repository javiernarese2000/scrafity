"use server";

import { db, socialAccounts, socialPublications } from "@scrapify/db";
import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";
import { decrypt } from "@/lib/crypto";
import { publicarReelInstagram, publicarVideoFacebook } from "@/lib/meta";

type Resultado = { ok: boolean; url?: string; error?: string };

/** Publica UNA social_publication a su red. Idempotente: si ya está publicada, no repite. */
export async function publicarUna(pubId: string): Promise<Resultado> {
  // Claim atómico: marca "publicando" sólo si estaba para enviar. Si no devuelve
  // fila, ya la tomó otro despacho (worker/panel) o ya se publicó → no repetir.
  const claimed = await db
    .update(socialPublications)
    .set({ estado: "publicando", updatedAt: new Date() })
    .where(
      and(
        eq(socialPublications.id, pubId),
        inArray(socialPublications.estado, ["en_cola", "error", "pendiente"]),
      ),
    )
    .returning({
      plataforma: socialPublications.plataforma,
      videoUrl: socialPublications.videoUrl,
      caption: socialPublications.caption,
      socialAccountId: socialPublications.socialAccountId,
    });

  const pub = claimed[0];
  if (!pub) return { ok: true }; // ya publicada o tomada por otro
  if (!pub.videoUrl) return falla(pubId, "La publicación no tiene video.");
  if (!pub.socialAccountId) return falla(pubId, "Sin cuenta destino.");

  const [acc] = await db
    .select({
      externalId: socialAccounts.externalId,
      credencialesCifradas: socialAccounts.credencialesCifradas,
      estado: socialAccounts.estado,
      nombre: socialAccounts.nombre,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.id, pub.socialAccountId))
    .limit(1);

  if (!acc?.externalId || !acc.credencialesCifradas) {
    return falla(pubId, "La cuenta no está conectada (falta token). Reconectá con Meta.");
  }

  let token: string;
  try {
    token = decrypt(acc.credencialesCifradas);
  } catch {
    return falla(pubId, "No se pudo leer el token de la cuenta.");
  }

  const caption = pub.caption ?? "";
  try {
    let res;
    if (pub.plataforma === "facebook") {
      res = await publicarVideoFacebook({
        pageId: acc.externalId,
        token,
        videoUrl: pub.videoUrl,
        caption,
      });
    } else if (pub.plataforma === "instagram") {
      res = await publicarReelInstagram({
        igUserId: acc.externalId,
        token,
        videoUrl: pub.videoUrl,
        caption,
      });
    } else {
      return falla(pubId, "TikTok todavía no está conectado.");
    }

    await db
      .update(socialPublications)
      .set({
        estado: "publicada",
        urlPublicada: res.url,
        externalId: res.id,
        error: null,
        publicadaEn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(socialPublications.id, pubId));
    await registrar({
      accion: "publicacion.publicar",
      entidad: "publicacion",
      entidadId: pubId,
      resumen: `Publicó en ${pub.plataforma} (@${acc.nombre})`,
      meta: { plataforma: pub.plataforma, url: res.url },
    });
    return { ok: true, url: res.url };
  } catch (e) {
    return falla(pubId, e instanceof Error ? e.message : "Error al publicar.", pub.plataforma);
  }
}

async function falla(
  pubId: string,
  msg: string,
  plataforma?: string,
): Promise<Resultado> {
  await db
    .update(socialPublications)
    .set({ estado: "error", error: msg.slice(0, 1000), updatedAt: new Date() })
    .where(eq(socialPublications.id, pubId));
  await registrar({
    accion: "publicacion.publicar",
    entidad: "publicacion",
    entidadId: pubId,
    resumen: `Falló la publicación${plataforma ? ` en ${plataforma}` : ""}`,
    resultado: "error",
    error: msg,
  });
  return { ok: false, error: msg };
}

/** Publica todas las que están en cola y ya les llegó la hora (programadaEn <= now). */
export async function despachar(): Promise<{ publicadas: number; errores: string[] }> {
  const due = await db
    .select({ id: socialPublications.id })
    .from(socialPublications)
    .where(
      and(
        eq(socialPublications.estado, "en_cola"),
        isNotNull(socialPublications.programadaEn),
        lte(socialPublications.programadaEn, new Date()),
      ),
    )
    .orderBy(asc(socialPublications.programadaEn))
    .limit(20);

  let publicadas = 0;
  const errores: string[] = [];
  for (const d of due) {
    const r = await publicarUna(d.id);
    if (r.ok) publicadas++;
    else if (r.error) errores.push(r.error);
  }
  revalidatePath("/publicaciones");
  revalidatePath("/agenda");
  return { publicadas, errores };
}

/** Publica una al instante desde el panel (botón "Publicar ahora"). */
export async function publicarYa(pubId: string): Promise<Resultado> {
  const r = await publicarUna(pubId);
  revalidatePath("/publicaciones");
  revalidatePath("/agenda");
  return r;
}
