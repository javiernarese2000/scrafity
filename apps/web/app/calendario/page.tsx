import { db, destinations } from "@scrapify/db";

import { CalendarioBoard } from "@/components/calendario/calendario-board";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const destinos = await db
    .select({ id: destinations.id, nombre: destinations.nombre })
    .from(destinations);

  return <CalendarioBoard destinos={destinos} />;
}
