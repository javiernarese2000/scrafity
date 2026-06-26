import { resolve } from "node:path";

import type { NextConfig } from "next";

// En el monorepo el .env vive en la raíz; Next solo lee desde apps/social.
try {
  process.loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch {
  // Sin .env (ej. CI): las variables vendrán del entorno.
}

const nextConfig: NextConfig = {
  transpilePackages: ["@scrapify/ui"],
};

export default nextConfig;
