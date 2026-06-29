import { marcarSourceEliminado, sourcesParaLimpiar } from "./db.js";
import { borrar } from "./storage.js";

const DIAS_TTL = 14; // a los 14 días se borra el video original (no el resultado)
const CADA_MS = 6 * 60 * 60 * 1000; // revisa cada 6 horas

/** Borra los originales viejos una pasada. Devuelve cuántos limpió. */
async function limpiarUnaVez(): Promise<number> {
  const rows = await sourcesParaLimpiar(DIAS_TTL);
  let n = 0;
  for (const r of rows) {
    try {
      await borrar(r.source_path);
      await marcarSourceEliminado(r.id);
      n++;
    } catch (e) {
      console.error(`retención: no se pudo limpiar ${r.id}:`, e);
    }
  }
  return n;
}

/** Loop de retención: borra los originales con más de 14 días, cada 6h. */
export function iniciarRetencion(): void {
  const correr = () =>
    limpiarUnaVez()
      .then((n) => {
        if (n > 0) console.log(`🧹 retención: ${n} originales borrados`);
      })
      .catch((e) => console.error("retención:", e));

  // Primera pasada al arrancar (con un respiro), después cada 6h.
  setTimeout(correr, 30_000);
  setInterval(correr, CADA_MS);
  console.log(`retención de originales activa (TTL ${DIAS_TTL}d, cada 6h)`);
}
