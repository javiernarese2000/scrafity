/**
 * Helpers de TikTok (Login Kit v2 + Content Posting API).
 * Con el scope `video.upload` el video se manda a los BORRADORES del usuario (su
 * inbox de TikTok); la persona termina de postear desde la app. El "Direct Post"
 * (publicación pública automática) requiere la auditoría de la app.
 */

const AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const API = "https://open.tiktokapis.com/v2";

export const SCOPES = "user.info.basic,video.upload";

export function clientKey(): string {
  const v = process.env.TIKTOK_CLIENT_KEY;
  if (!v) throw new Error("Falta TIKTOK_CLIENT_KEY.");
  return v;
}
function clientSecret(): string {
  const v = process.env.TIKTOK_CLIENT_SECRET;
  if (!v) throw new Error("Falta TIKTOK_CLIENT_SECRET.");
  return v;
}
export function redirectUri(): string {
  return (
    process.env.TIKTOK_REDIRECT_URI ??
    "https://zoocial.up.railway.app/api/tiktok/callback"
  );
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_key: clientKey(),
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTH}?${p.toString()}`;
}

export type TikTokTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // segundos del access token (~24h)
  open_id: string;
  scope: string;
};

/** Lo que guardamos cifrado por cuenta: access + refresh + vencimiento (ms). */
export type TikTokCreds = { a: string; r: string; exp: number };

async function postToken(params: Record<string, string>): Promise<TikTokTokens> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = (await res.json()) as Record<string, unknown>;
  if (!res.ok || j.error) {
    throw new Error(String(j.error_description ?? j.error ?? `TikTok token HTTP ${res.status}`));
  }
  return j as unknown as TikTokTokens;
}

export function exchangeCode(code: string): Promise<TikTokTokens> {
  return postToken({
    client_key: clientKey(),
    client_secret: clientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });
}

export function refreshToken(refresh: string): Promise<TikTokTokens> {
  return postToken({
    client_key: clientKey(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
}

export async function getUserInfo(
  accessToken: string,
): Promise<{ openId: string; nombre: string }> {
  const res = await fetch(
    `${API}/user/info/?fields=open_id,display_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const j = (await res.json()) as {
    data?: { user?: { open_id?: string; display_name?: string } };
    error?: { code?: string; message?: string };
  };
  if (j.error && j.error.code !== "ok") {
    throw new Error(j.error.message ?? "TikTok user info falló.");
  }
  const u = j.data?.user;
  return { openId: u?.open_id ?? "", nombre: u?.display_name || "TikTok" };
}

const MAX = 64 * 1024 * 1024; // 64 MB en un solo chunk

/**
 * Sube el video al inbox/borradores del usuario (FILE_UPLOAD, un solo chunk).
 * Devuelve el publish_id. La persona finaliza la publicación en la app de TikTok.
 */
export async function subirVideoTikTok(
  accessToken: string,
  videoUrl: string,
): Promise<string> {
  const vres = await fetch(videoUrl);
  if (!vres.ok) throw new Error("No se pudo descargar el video para TikTok.");
  const buf = Buffer.from(await vres.arrayBuffer());
  const size = buf.length;
  if (size > MAX) {
    throw new Error("El video supera los 64 MB (TikTok, esta versión).");
  }

  // 1) init
  const initRes = await fetch(`${API}/post/publish/inbox/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  });
  const ij = (await initRes.json()) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (!initRes.ok || (ij.error && ij.error.code !== "ok")) {
    throw new Error(ij.error?.message ?? `TikTok init HTTP ${initRes.status}`);
  }
  const publishId = ij.data?.publish_id;
  const uploadUrl = ij.data?.upload_url;
  if (!publishId || !uploadUrl) throw new Error("TikTok no devolvió la URL de subida.");

  // 2) subir los bytes
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body: buf,
  });
  if (!put.ok) {
    throw new Error(`TikTok upload falló (HTTP ${put.status}).`);
  }
  return publishId;
}
