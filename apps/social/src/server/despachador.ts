"use server";

import { db, socialAccounts, socialPublications } from "@scrapify/db";
import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";
import { decrypt, encrypt } from "@/lib/crypto";
import { publicarReelInstagram, publicarVideoFacebook } from "@/lib/meta";
import {
  refreshToken,
  subirVideoTikTok,
  type TikTokCreds,
} from "@/lib/tiktok";

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

  const caption = pub.caption ?? "";
  try {
    let externalId: string;
    let url: string | null;

    if (pub.plataforma === "tiktok") {
      // El video va a los BORRADORES del usuario; finaliza en la app de TikTok.
      const access = await accesoTikTok(pub.socialAccountId, acc.credencialesCifradas);
      externalId = await subirVideoTikTok(access, pub.videoUrl);
      url = null;
    } else {
      const token = decrypt(acc.credencialesCifradas);
      if (pub.plataforma === "facebook") {
        const r = await publicarVideoFacebook({
          pageId: acc.externalId,
          token,
          videoUrl: pub.videoUrl,
          caption,
        });
        externalId = r.id;
        url = r.url;
      } else if (pub.plataforma === "instagram") {
        const r = await publicarReelInstagram({
          igUserId: acc.externalId,
          token,
          videoUrl: pub.videoUrl,
          caption,
        });
        externalId = r.id;
        url = r.url;
      } else {
        return falla(pubId, "Plataforma no soportada.");
      }
    }

    await db
      .update(socialPublications)
      .set({
        estado: "publicada",
        urlPublicada: url,
        externalId,
        error: null,
        publicadaEn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(socialPublications.id, pubId));
    await registrar({
      accion: "publicacion.publicar",
      entidad: "publicacion",
      entidadId: pubId,
      resumen:
        pub.plataforma === "tiktok"
          ? `Envió a TikTok como borrador (@${acc.nombre})`
          : `Publicó en ${pub.plataforma} (@${acc.nombre})`,
      meta: { plataforma: pub.plataforma, url },
    });
    return { ok: true, url: url ?? undefined };
  } catch (e) {
    return falla(pubId, e instanceof Error ? e.message : "Error al publicar.", pub.plataforma);
  }
}

/** Devuelve un access token de TikTok válido (refresca y persiste si venció). */
async function accesoTikTok(accountId: string, cifrado: string): Promise<string> {
  const creds = JSON.parse(decrypt(cifrado)) as TikTokCreds;
  if (Date.now() < creds.exp - 60_000) return creds.a;
  const t = await refreshToken(creds.r);
  const nuevo: TikTokCreds = {
    a: t.access_token,
    r: t.refresh_token,
    exp: Date.now() + t.expires_in * 1000,
  };
  await db
    .update(socialAccounts)
    .set({
      credencialesCifradas: encrypt(JSON.stringify(nuevo)),
      expiraEn: new Date(nuevo.exp),
      updatedAt: new Date(),
    })
    .where(eq(socialAccounts.id, accountId));
  return nuevo.a;
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
