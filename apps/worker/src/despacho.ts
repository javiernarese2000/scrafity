/**
 * Despacho automático de publicaciones programadas. El worker (siempre on) le
 * pega cada 60s al endpoint del panel, que suelta las que ya vencieron. Así las
 * programadas salen sin depender de tener el navegador abierto.
 * DISPATCH_URL: dev = http://host.docker.internal:5556/api/cron/despachar;
 *               prod = https://<panel>/api/cron/despachar?key=<CRON_SECRET>.
 */

const URL = process.env.DISPATCH_URL ?? "";
const CADA_MS = 60_000;

async function pegar(): Promise<void> {
  try {
    const r = await fetch(URL);
    const j = (await r.json().catch(() => ({}))) as {
      publicadas?: number;
      errores?: string[];
    };
    if (j.publicadas && j.publicadas > 0) {
      console.log(`📤 despacho: ${j.publicadas} publicada(s)`);
    }
    if (j.errores && j.errores.length) {
      console.log(`📤 despacho con errores:`, j.errores);
    }
  } catch (e) {
    console.error("despacho:", e instanceof Error ? e.message : e);
  }
}

export function iniciarDespacho(): void {
  if (!URL) {
    console.log("despacho automático OFF (sin DISPATCH_URL)");
    return;
  }
  let corriendo = false;
  const tick = async () => {
    if (corriendo) return; // el despacho de IG puede tardar; no solapar
    corriendo = true;
    try {
      await pegar();
    } finally {
      corriendo = false;
    }
  };
  setTimeout(tick, 15_000); // primera pasada al ratito de arrancar
  setInterval(tick, CADA_MS);
  console.log(`despacho automático activo (cada 60s → ${URL})`);
}
