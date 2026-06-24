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
