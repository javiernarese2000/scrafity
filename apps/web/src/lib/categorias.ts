// Color estable por categoría, mapeado a los tokens de data-viz del tema.
// Las categorías comunes tienen color fijo; el resto se asigna por hash estable.
const VIZ = [
  "--color-viz-1",
  "--color-viz-2",
  "--color-viz-3",
  "--color-viz-4",
  "--color-viz-5",
  "--color-viz-6",
] as const;

const FIJAS: Record<string, number> = {
  politica: 0,
  política: 0,
  economia: 1,
  economía: 1,
  deportes: 2,
  sociedad: 3,
  tecnologia: 4,
  tecnología: 4,
  espectaculos: 5,
  espectáculos: 5,
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Devuelve `var(--color-viz-N)` estable para una categoría. */
export function colorCategoria(nombre: string | null): string {
  const k = (nombre ?? "—").trim().toLowerCase();
  const idx = k in FIJAS ? FIJAS[k]! : hash(k) % VIZ.length;
  return `var(${VIZ[idx]})`;
}

export function nombreCategoria(nombre: string | null): string {
  return nombre?.trim() || "sin categoría";
}

// ── Taxonomía canónica ─────────────────────────────────────────────────────
// Para no ensuciar el WP del cliente con variantes (Internacional/Internacionales,
// Política/Politicas), toda categoría se mapea a UN término de esta lista antes
// de llegar a WordPress. La IA clasifica libre, pero la categoría se canoniza.
const CANON: { nombre: string; alias: string[] }[] = [
  { nombre: "Política", alias: ["politica", "politicas", "politico", "gobierno", "elecciones", "congreso"] },
  { nombre: "Economía", alias: ["economia", "economias", "finanzas", "mercado", "mercados", "negocios", "dolar", "inflacion"] },
  { nombre: "Sociedad", alias: ["sociedad", "social", "comunidad"] },
  { nombre: "Internacional", alias: ["internacional", "internacionales", "mundo", "exterior", "global"] },
  { nombre: "Deportes", alias: ["deporte", "deportes", "deportivo", "futbol", "basquet", "tenis"] },
  { nombre: "Tecnología", alias: ["tecnologia", "tecnologias", "tech", "tecno", "informatica", "gadgets"] },
  { nombre: "Espectáculos", alias: ["espectaculo", "espectaculos", "farandula", "show", "entretenimiento", "famosos"] },
  { nombre: "Policiales", alias: ["policial", "policiales", "sucesos", "inseguridad", "crimen", "narcotrafico"] },
  { nombre: "Cultura", alias: ["cultura", "cultural", "arte", "literatura", "cine", "musica", "teatro", "libros"] },
  { nombre: "Salud", alias: ["salud", "medicina", "bienestar", "nutricion"] },
  { nombre: "Ciencia", alias: ["ciencia", "ciencias", "cientifico", "espacio", "astronomia"] },
  { nombre: "Educación", alias: ["educacion", "educativo", "universidad", "escuela"] },
  { nombre: "Medio Ambiente", alias: ["medio ambiente", "ambiente", "ecologia", "clima", "sustentabilidad"] },
  { nombre: "Turismo", alias: ["turismo", "viajes", "destinos"] },
  { nombre: "Opinión", alias: ["opinion", "opiniones", "editorial", "columna", "analisis"] },
];

/** Categoría de descarte cuando nada matchea (evita inventar términos nuevos). */
export const CATEGORIA_GENERAL = "General";

/** Nombres canónicos (sin "General"), para constreñir a la IA en el prompt. */
export const CATEGORIAS = CANON.map((c) => c.nombre);

function clave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// alias normalizado → nombre canónico (incluye el propio nombre canónico).
const INDICE = new Map<string, string>();
for (const { nombre, alias } of CANON) {
  INDICE.set(clave(nombre), nombre);
  for (const a of alias) INDICE.set(clave(a), nombre);
}

/**
 * Mapea cualquier variante a UN término canónico. Si no está en la taxonomía,
 * cae en "General" (no se inventan categorías nuevas en el WP del cliente).
 */
export function canonizarCategoria(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return CATEGORIA_GENERAL;
  return INDICE.get(clave(raw)) ?? CATEGORIA_GENERAL;
}

/**
 * Clave estable para comparar/deduplicar categorías. Colapsa las variantes
 * CONOCIDAS a su canónica (Internacional/Internacionales → mismo key), pero
 * preserva la identidad de las desconocidas (no las fuerza a "General"), así
 * las columnas de la bandeja no pierden categorías reales del WP.
 */
export function claveCategoria(raw: string | null | undefined): string {
  if (!raw) return "";
  const k = clave(raw);
  const canon = INDICE.get(k);
  return canon ? clave(canon) : k;
}
