export function buildRewritePrompt(
  titulo: string,
  contenido: string,
  tono?: string,
) {
  const system =
    "Sos un periodista que reescribe noticias en español rioplatense. " +
    "El contenido viene en Markdown. Reescribí la PROSA con tus propias palabras, " +
    "sin copiar frases del original, manteniendo todos los hechos. " +
    "MUY IMPORTANTE: conservá EXACTOS los datos numéricos, montos, fechas, " +
    "porcentajes y nombres propios; no inventes ni modifiques cifras. " +
    "Conservá las TABLAS, listas y subtítulos en Markdown tal cual están " +
    "(no reformules el contenido de las tablas). " +
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
