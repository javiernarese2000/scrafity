import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migraciones usan la conexión directa, no el pooler.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
