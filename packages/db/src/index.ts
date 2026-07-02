import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

// Cache en globalThis: el HMR de dev re-evalúa el módulo y, con un `let` local,
// crearía un pool nuevo por recarga sin cerrar el anterior → se filtran conexiones
// hasta agotar el límite del pooler. Guardándolo en globalThis se reusa.
const globalForDb = globalThis as unknown as {
  __sqlClient?: ReturnType<typeof postgres>;
  __dbInstance?: Database;
};

export function getDb(): Database {
  if (!globalForDb.__dbInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL no está definida");
    }
    // Supabase usa pgbouncer (transaction mode): sin prepared statements.
    // Config mínima e igual a la versión probada en producción; el cache en
    // globalThis (arriba) es lo único que evita la fuga de conexiones en dev.
    const client =
      globalForDb.__sqlClient ?? postgres(connectionString, { prepare: false });
    globalForDb.__sqlClient = client;
    globalForDb.__dbInstance = drizzle(client, { schema });
  }
  return globalForDb.__dbInstance;
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
