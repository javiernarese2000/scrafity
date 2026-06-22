export type DiffSeg = { type: "equal" | "added" | "removed"; text: string };

/**
 * Diff por palabras (LCS) entre el texto original y la versión reescrita.
 * - "removed": presente en el original, no en la versión.
 * - "added": presente en la versión, no en el original.
 * Suficiente para resaltar cambios en la moderación (no es un diff semántico).
 */
export function wordDiff(original: string, revised: string): DiffSeg[] {
  const a = original.split(/\s+/).filter(Boolean);
  const b = revised.split(/\s+/).filter(Boolean);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const segs: DiffSeg[] = [];
  const push = (type: DiffSeg["type"], word: string) => {
    const last = segs[segs.length - 1];
    if (last && last.type === type) last.text += " " + word;
    else segs.push({ type, text: word });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("equal", a[i]!);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push("removed", a[i]!);
      i++;
    } else {
      push("added", b[j]!);
      j++;
    }
  }
  while (i < n) push("removed", a[i++]!);
  while (j < m) push("added", b[j++]!);

  return segs;
}

function normalizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // saca puntuación, conserva letras/números
    .split(/\s+/)
    .filter(Boolean);
}

function trigramas(palabras: string[]): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + 2 < palabras.length; i++) {
    set.add(`${palabras[i]} ${palabras[i + 1]} ${palabras[i + 2]}`);
  }
  return set;
}

/**
 * Similitud del texto reescrito respecto del original (0..1).
 * Mide PLAGIO REAL: proporción de trigramas (frases de 3 palabras) del texto
 * reescrito que aparecen textuales en el original. Ignorar palabras sueltas
 * compartidas evita inflar el número con vocabulario en común.
 */
export function computeSimilarity(original: string, revised: string): number {
  const rev = trigramas(normalizar(revised));
  if (rev.size === 0) return 0;
  const orig = trigramas(normalizar(original));
  let compartidos = 0;
  for (const g of rev) if (orig.has(g)) compartidos++;
  return compartidos / rev.size;
}
