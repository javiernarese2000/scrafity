import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// El .env vive en la raíz del monorepo.
config({ path: "../../.env" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migraciones usan la conexión directa, no el pooler.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
