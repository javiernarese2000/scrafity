import { resolve } from "node:path";

import type { NextConfig } from "next";

// En el monorepo el .env vive en la raíz; Next solo lee desde apps/social.
try {
  process.loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch {
  // Sin .env (ej. CI): las variables vendrán del entorno.
}

const nextConfig: NextConfig = {
  transpilePackages: ["@scrapify/ui", "@scrapify/db"],
  experimental: {
    // El render manda la config con el logo embebido (data URL); el límite de
    // 1 MB por defecto se queda corto con logos grandes.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
