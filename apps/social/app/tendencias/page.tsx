import { TendenciasBoard } from "@/components/tendencias/tendencias-board";
import { getTendencias } from "@/server/tendencias";

export const dynamic = "force-dynamic";

export default async function TendenciasPage() {
  const inicial = await getTendencias("AR");
  return <TendenciasBoard inicial={inicial} geoInicial="AR" />;
}
