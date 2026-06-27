import { RendersBoard } from "@/components/renders/renders-board";
import { listarRenders } from "@/server/render";

export default async function RendersPage() {
  const inicial = await listarRenders();
  return <RendersBoard inicial={inicial} />;
}
