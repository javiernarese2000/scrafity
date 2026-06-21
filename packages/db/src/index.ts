import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let instance: Database | undefined;

export function getDb(): Database {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL no está definida");
    }
    // Supabase usa pgbouncer (transaction mode): sin prepared statements.
    const client = postgres(connectionString, { prepare: false });
    instance = drizzle(client, { schema });
  }
  return instance;
}

// Acceso perezoso: la conexión no se abre hasta el primer uso (no rompe el build).
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getDb();
    return Reflect.get(real as object, prop, receiver) as unknown;
  },
});

export * from "./schema";
export { schema };
