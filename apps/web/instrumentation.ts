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
  const correr = async () => {
    try {
      const r = await despachar();
      if (r.despachadas > 0 || r.errores > 0) {
        console.log(`[despachador] ${r.despachadas} publicadas, ${r.errores} con error`);
      }
    } catch (e) {
      console.error("[despachador]", e);
    }
  };

  // Primera corrida poco después de arrancar; luego cada 2 minutos.
  setTimeout(correr, 15_000);
  setInterval(correr, 120_000);
  console.log("[despachador] scheduler en proceso activo (cada 2 min)");
}
