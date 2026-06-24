export function buildRewritePrompt(
  titulo: string,
  contenido: string,
  tono?: string,
  refuerzo?: string,
) {
  const system =
    "Sos un periodista que reescribe noticias en español rioplatense. " +
    "Si la nota original está en otro idioma, traducila y escribila igual en " +
    "español rioplatense (la salida SIEMPRE va en español). " +
    "El contenido viene en Markdown. Reescribí la nota DE CERO con tus propias " +
    "palabras, partiendo de los hechos y no del texto. " +
    "REGLA CLAVE contra el plagio: NO reutilices secuencias de más de 3 palabras " +
    "seguidas del original. Reescribí ABSOLUTAMENTE TODOS los párrafos, incluido el " +
    "medio y el final: es un error común cambiar solo la entrada y el cierre y dejar el " +
    "cuerpo igual — NO lo hagas. En cada párrafo cambiá el orden de la información, " +
    "arrancá las oraciones distinto, fusioná o partí oraciones y usá sinónimos; reordená " +
    "los párrafos cuando tenga sentido. " +
    "Lo ÚNICO que se mantiene textual: las CITAS literales entre comillas (lo que dijo " +
    "alguien; si están en otro idioma, traducilas), los DATOS (cifras, montos, fechas, " +
    "porcentajes), los nombres propios y las TABLAS. Todo lo demás, reformulado. " +
    (tono ? `Tono: ${tono}. ` : "") +
    (refuerzo ? `${refuerzo} ` : "") +
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
