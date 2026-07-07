// Despachador automático EN PROCESO. Corre mientras el servidor esté arriba y
// cada 2 minutos suelta las publicaciones programadas cuya hora ya venció (y las
// de cadencia). Reemplaza al cron de Inngest (que necesita servicio externo), así
// las notas del calendario salen solas a su hora sin que nadie esté presente.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Evita montar dos intervalos si register() se re-ejecuta (HMR, re-sync).
  const g = globalThis as unknown as { __despachadorActivo?: boolean };
  if (g.__despachadorActivo) return;
  g.__despachadorActivo = true;

  const { despachar } = await import("@/server/despachador");
  let corriendo = false;
  let ciclo = 0;
  // Red de seguridad: si la memoria del proceso se dispara (fuga real o
  // acumulada, cualquiera sea la causa), reinicia SOLO en vez de esperar a que
  // alguien note el sitio caído y haga redeploy a mano. Railway relanza el
  // contenedor automáticamente (restartPolicy ON_FAILURE en railway.json).
  const LIMITE_MB = 450;
  const correr = async () => {
    // Si la corrida anterior sigue viva (colgada por algo puntual de red/DB),
    // se saltea esta vez en vez de apilar corridas en paralelo — eso agotaba
    // el proceso hasta necesitar un redeploy para recuperarse.
    if (corriendo) {
      console.warn("[despachador] corrida anterior aún activa, se saltea este ciclo");
      return;
    }
    corriendo = true;
    try {
      const r = await despachar();
      if (r.despachadas > 0 || r.errores > 0) {
        console.log(`[despachador] ${r.despachadas} publicadas, ${r.errores} con error`);
      }
    } catch (e) {
      console.error("[despachador]", e);
    } finally {
      corriendo = false;
    }

    ciclo += 1;
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    if (ciclo % 8 === 0) console.log(`[memoria] RSS: ${rssMb} MB`);
    if (rssMb > LIMITE_MB) {
      console.error(
        `[memoria] RSS ${rssMb}MB supera el límite (${LIMITE_MB}MB) — reinicio preventivo`,
      );
      process.exit(1);
    }
  };

  // Primera corrida poco después de arrancar; luego cada 2 minutos.
  setTimeout(correr, 15_000);
  setInterval(correr, 120_000);
  console.log("[despachador] scheduler en proceso activo (cada 2 min)");
}
