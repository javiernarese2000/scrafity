export function buildRewritePrompt(
  titulo: string,
  contenido: string,
  tono?: string,
) {
  const system =
    "Sos un periodista que reescribe noticias en español rioplatense. " +
    "El contenido viene en Markdown. Reescribí la nota DE CERO con tus propias " +
    "palabras, como si la contaras a tu manera. " +
    "REGLA CLAVE contra el plagio: NO reutilices secuencias de más de 3 palabras " +
    "seguidas del original. Cambiá la estructura de las oraciones, el orden de los " +
    "párrafos y usá sinónimos; no sigas el fraseo del original. " +
    "Lo único que se mantiene idéntico son los DATOS (cifras, montos, fechas, " +
    "porcentajes), los nombres propios y las TABLAS (no reformules su contenido). " +
    "No inventes ni cambies datos. " +
    (tono ? `Tono: ${tono}. ` : "") +
    "Formato de salida EXACTO:\n" +
    "TÍTULO: <título reescrito>\n\n<cuerpo reescrito en Markdown>";

  const prompt = `Título original: ${titulo}\n\nNota original (Markdown):\n${contenido}`;

  return { system, prompt };
}

/** Parsea la salida "TÍTULO: ...\n\n<cuerpo md>" a { titulo, contenido }. */
export function parseRewrite(
  text: string,
  fallbackTitulo: string,
): { titulo: string; contenido: string } {
  const t = text.trim();
  const m = t.match(/^\s*T[IÍ]TULO:\s*(.+)/i);
  if (m && m[1]) {
    const titulo = m[1].trim();
    const contenido = t.slice(t.indexOf(m[0]) + m[0].length).trim();
    return { titulo, contenido: contenido || fallbackTitulo };
  }
  return { titulo: fallbackTitulo, contenido: t };
}
