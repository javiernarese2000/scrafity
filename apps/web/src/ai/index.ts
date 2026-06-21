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

/**
 * Genera con el proveedor primario y, ante un fallo, reintenta con el otro.
 * "auto" usa DeepSeek (volumen/barato) como primario y Claude como respaldo.
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
    try {
      return await providers[name].generate(input);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Todos los proveedores de IA fallaron: ${String(lastError)}`,
  );
}
