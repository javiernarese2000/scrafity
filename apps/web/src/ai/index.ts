import { claudeProvider } from "./claude";
import { deepseekProvider } from "./deepseek";
import type { AIProvider, GenerateInput, GenerateResult, ProviderName } from "./provider";

export type { GenerateInput, GenerateResult, ProviderName } from "./provider";

const providers: Record<ProviderName, AIProvider> = {
  deepseek: deepseekProvider,
  claude: claudeProvider,
};

export function getProvider(name: ProviderName): AIProvider {
  return providers[name];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Detecta errores de rate limit (429) para reintentar con backoff. */
function esRateLimit(err: unknown): boolean {
  const s = String(err);
  return s.includes("429") || /rate.?limit/i.test(s);
}

// Esperas (ms) entre reintentos cuando un proveedor devuelve 429.
const BACKOFF = [2000, 5000, 10000];

/**
 * Genera con el proveedor primario y, ante un fallo, reintenta con el otro.
 * "auto" usa DeepSeek (volumen/barato) como primario y Claude como respaldo.
 * Ante 429 (rate limit) reintenta el mismo proveedor con backoff antes de
 * pasar al siguiente.
 */
export async function generate(
  input: GenerateInput,
  preferred: ProviderName | "auto" = "auto",
): Promise<GenerateResult> {
  const order: ProviderName[] =
    preferred === "auto" || preferred === "deepseek"
      ? ["deepseek", "claude"]
      : ["claude", "deepseek"];

  let lastError: unknown;
  for (const name of order) {
    for (let intento = 0; intento <= BACKOFF.length; intento++) {
      try {
        return await providers[name].generate(input);
      } catch (err) {
        lastError = err;
        // Solo esperamos y reintentamos si es rate limit y quedan intentos.
        if (esRateLimit(err) && intento < BACKOFF.length) {
          await sleep(BACKOFF[intento]!);
          continue;
        }
        break; // otro error o sin intentos → probar siguiente proveedor
      }
    }
  }
  throw new Error(`Todos los proveedores de IA fallaron: ${String(lastError)}`);
}
