/**
 * Helpers de la Graph API de Meta (Facebook + Instagram).
 * Flujo: code → token de usuario (corto) → token largo → Páginas (+ IG vinculado).
 * Los tokens de Página, en modo desarrollo y con el usuario admin de la app,
 * permiten publicar sin App Review.
 */

const VER = "v21.0";
const GRAPH = `https://graph.facebook.com/${VER}`;
const DIALOG = `https://www.facebook.com/${VER}/dialog/oauth`;

/** Permisos para publicar en Páginas de FB y en cuentas de IG Business. */
export const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export function appId(): string {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("Falta META_APP_ID en el entorno.");
  return v;
}

function appSecret(): string {
  const v = process.env.META_APP_SECRET;
  if (!v) throw new Error("Falta META_APP_SECRET en el entorno.");
  return v;
}

export function redirectUri(): string {
  return (
    process.env.META_REDIRECT_URI ?? "http://localhost:5556/api/meta/callback"
  );
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: appId(),
    redirect_uri: redirectUri(),
    state,
    response_type: "code",
    scope: SCOPES,
  });
  return `${DIALOG}?${p.toString()}`;
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const r = await fetch(url);
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok || j.error) {
    const e = j.error as { message?: string } | undefined;
    throw new Error(e?.message ?? `Meta API HTTP ${r.status}`);
  }
  return j;
}

async function postJson(
  url: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok || j.error) {
    const e = j.error as { message?: string } | undefined;
    throw new Error(e?.message ?? `Meta API HTTP ${r.status}`);
  }
  return j;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** code → token de usuario de corta duración. */
export async function exchangeCode(code: string): Promise<string> {
  const p = new URLSearchParams({
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri(),
    code,
  });
  const j = await getJson(`${GRAPH}/oauth/access_token?${p.toString()}`);
  return j.access_token as string;
}

/** token corto → token largo (~60 días). */
export async function longLivedToken(shortToken: string): Promise<string> {
  const p = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId(),
    client_secret: appSecret(),
    fb_exchange_token: shortToken,
  });
  const j = await getJson(`${GRAPH}/oauth/access_token?${p.toString()}`);
  return j.access_token as string;
}

export type MetaPage = {
  id: string;
  name: string;
  accessToken: string;
  ig?: { id: string; username: string };
};

/** Páginas del usuario con su token y la cuenta de IG Business vinculada. */
export async function listPagesWithIg(userToken: string): Promise<MetaPage[]> {
  const p = new URLSearchParams({
    fields: "name,access_token,instagram_business_account{id,username}",
    access_token: userToken,
    limit: "100",
  });
  const j = await getJson(`${GRAPH}/me/accounts?${p.toString()}`);
  const data = (j.data ?? []) as Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string; username: string };
  }>;
  return data.map((d) => ({
    id: d.id,
    name: d.name,
    accessToken: d.access_token,
    ig: d.instagram_business_account
      ? {
          id: d.instagram_business_account.id,
          username: d.instagram_business_account.username,
        }
      : undefined,
  }));
}

// ───────────────────────── Publicación ─────────────────────────

export type ResultadoPub = { id: string; url: string };

/**
 * Publica el video en una Página de Facebook. Meta lo baja desde `videoUrl`
 * (público) y lo procesa en segundo plano; devuelve el id al instante.
 */
export async function publicarVideoFacebook(input: {
  pageId: string;
  token: string;
  videoUrl: string;
  caption: string;
}): Promise<ResultadoPub> {
  const j = await postJson(`${GRAPH}/${input.pageId}/videos`, {
    file_url: input.videoUrl,
    description: input.caption,
    access_token: input.token,
  });
  const id = String(j.id ?? "");
  return { id, url: `https://www.facebook.com/${id}` };
}

/**
 * Publica un Reel en Instagram (cuenta Business): crea el contenedor, espera a
 * que Meta termine de procesar el video y recién ahí lo publica.
 */
export async function publicarReelInstagram(input: {
  igUserId: string;
  token: string;
  videoUrl: string;
  caption: string;
}): Promise<ResultadoPub> {
  // 1) Contenedor
  const cont = await postJson(`${GRAPH}/${input.igUserId}/media`, {
    media_type: "REELS",
    video_url: input.videoUrl,
    caption: input.caption,
    access_token: input.token,
  });
  const creationId = String(cont.id ?? "");
  if (!creationId) throw new Error("Instagram no devolvió el contenedor.");

  // 2) Esperar a que el video quede listo (FINISHED). Hasta ~90s.
  for (let i = 0; i < 18; i++) {
    await sleep(5000);
    const st = await getJson(
      `${GRAPH}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(input.token)}`,
    );
    const code = String(st.status_code ?? "");
    if (code === "FINISHED") break;
    if (code === "ERROR")
      throw new Error("Instagram falló al procesar el video: " + String(st.status ?? ""));
    if (i === 17)
      throw new Error("Instagram tardó demasiado en procesar el video.");
  }

  // 3) Publicar
  const pub = await postJson(`${GRAPH}/${input.igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: input.token,
  });
  const mediaId = String(pub.id ?? "");

  // 4) Permalink (best-effort)
  let url = `https://www.instagram.com/`;
  try {
    const m = await getJson(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(input.token)}`,
    );
    if (m.permalink) url = String(m.permalink);
  } catch {
    // si no se puede traer el permalink, no es crítico
  }
  return { id: mediaId, url };
}

/** Publica una FOTO en una Página de Facebook. */
export async function publicarFotoFacebook(input: {
  pageId: string;
  token: string;
  imageUrl: string;
  caption: string;
}): Promise<ResultadoPub> {
  const j = await postJson(`${GRAPH}/${input.pageId}/photos`, {
    url: input.imageUrl,
    caption: input.caption,
    access_token: input.token,
  });
  const id = String(j.post_id ?? j.id ?? "");
  return { id, url: `https://www.facebook.com/${id}` };
}

/** Publica una IMAGEN en Instagram (post de feed). */
export async function publicarImagenInstagram(input: {
  igUserId: string;
  token: string;
  imageUrl: string;
  caption: string;
}): Promise<ResultadoPub> {
  const cont = await postJson(`${GRAPH}/${input.igUserId}/media`, {
    image_url: input.imageUrl,
    caption: input.caption,
    access_token: input.token,
  });
  const creationId = String(cont.id ?? "");
  if (!creationId) throw new Error("Instagram no devolvió el contenedor.");

  // Las imágenes suelen estar listas al instante; reintenta unas veces por las dudas.
  let mediaId = "";
  for (let i = 0; i < 6; i++) {
    try {
      const pub = await postJson(`${GRAPH}/${input.igUserId}/media_publish`, {
        creation_id: creationId,
        access_token: input.token,
      });
      mediaId = String(pub.id ?? "");
      break;
    } catch (e) {
      if (i === 5) throw e;
      await sleep(3000);
    }
  }

  let url = `https://www.instagram.com/`;
  try {
    const m = await getJson(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(input.token)}`,
    );
    if (m.permalink) url = String(m.permalink);
  } catch {
    // no crítico
  }
  return { id: mediaId, url };
}
