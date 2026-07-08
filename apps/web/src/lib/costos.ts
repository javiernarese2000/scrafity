// Tarifas de lista APROXIMADAS (USD por 1.000.000 de tokens). No hay una API
// en vivo para consultar el precio exacto del momento — ajustar acá si el
// proveedor cambia sus tarifas.
const TARIFAS: Record<string, { in: number; out: number }> = {
  deepseek: { in: 0.27, out: 1.1 },
  claude: { in: 3.0, out: 15.0 },
};

/** Costo estimado en USD de una generación, según proveedor y tokens. */
export function costoUSD(
  proveedor: string | null | undefined,
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined,
): number {
  const t = TARIFAS[proveedor ?? ""] ?? TARIFAS.deepseek!;
  const costoIn = ((tokensIn ?? 0) / 1_000_000) * t.in;
  const costoOut = ((tokensOut ?? 0) / 1_000_000) * t.out;
  return costoIn + costoOut;
}

/** Formatea un monto en USD, legible incluso para centavos chicos. */
export function formatUSD(n: number): string {
  if (n > 0 && n < 0.01) return "< US$0,01";
  return `US$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Formatea una cantidad de tokens de forma compacta (1.2K, 34K, 1.1M). */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
