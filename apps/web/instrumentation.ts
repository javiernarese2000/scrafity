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
  let saltosSeguidos = 0;

  const LIMITE_MB = 450;
  // Ninguna corrida puede durar más de esto — si algo interno se cuelga (un
  // fetch o una query que ignoró su propio timeout), esto la corta igual, en
  // vez de dejar `corriendo` en true para siempre (lo que pasó: la memoria
  // NUNCA llegaba a chequearse porque el código cortaba antes con un return).
  const TIMEOUT_CICLO_MS = 90_000;
  // Si aun así queda trabado varios ciclos seguidos, reinicio forzado sin
  // esperar al límite de memoria (un colgado no necesariamente usa memoria).
  const MAX_SALTOS_SEGUIDOS = 5;

  function conTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`ciclo del despachador colgado (>${ms}ms)`)), ms),
      ),
    ]);
  }

  const correr = async () => {
    if (corriendo) {
      saltosSeguidos += 1;
      console.warn(
        `[despachador] corrida anterior aún activa (${saltosSeguidos}/${MAX_SALTOS_SEGUIDOS}), se saltea este ciclo`,
      );
      if (saltosSeguidos >= MAX_SALTOS_SEGUIDOS) {
        console.error(
          `[despachador] colgado ${saltosSeguidos} ciclos seguidos — reinicio forzado`,
        );
        process.exit(1);
      }
      return;
    }
    saltosSeguidos = 0;
    corriendo = true;
    try {
      const r = await conTimeout(despachar(), TIMEOUT_CICLO_MS);
      if (r.despachadas > 0 || r.errores > 0) {
        console.log(`[despachador] ${r.despachadas} publicadas, ${r.errores} con error`);
      }
    } catch (e) {
      console.error("[despachador]", e instanceof Error ? e.message : e);
    } finally {
      // Se libera SIEMPRE (el race garantiza que esto se alcanza como máximo
      // a los TIMEOUT_CICLO_MS), así el próximo ciclo puede reintentar.
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
