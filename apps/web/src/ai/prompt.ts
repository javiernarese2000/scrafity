export function buildRewritePrompt(
  titulo: string,
  contenido: string,
  tono?: string,
) {
  const system =
    "Sos un periodista que reescribe noticias en español rioplatense. " +
    "Reescribí la nota con tus propias palabras, sin copiar frases del original, " +
    "manteniendo los hechos, datos y nombres propios. " +
    (tono ? `Tono: ${tono}. ` : "") +
    'Devolvé SOLO un objeto JSON válido con esta forma exacta: ' +
    '{"titulo": "...", "contenido": "..."} sin texto adicional ni markdown.';

  const prompt = `Título original: ${titulo}\n\nNota original:\n${contenido}`;

  return { system, prompt };
}

/** Parsea la salida del modelo a { titulo, contenido }, tolerante a fences/ruido. */
export function parseRewrite(
  text: string,
  fallbackTitulo: string,
): { titulo: string; contenido: string } {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned) as { titulo?: string; contenido?: string };
    if (obj.contenido) {
      return {
        titulo: obj.titulo?.trim() || fallbackTitulo,
        contenido: obj.contenido.trim(),
      };
    }
  } catch {
    // No era JSON: usamos el texto como contenido.
  }
  return { titulo: fallbackTitulo, contenido: cleaned };
}
