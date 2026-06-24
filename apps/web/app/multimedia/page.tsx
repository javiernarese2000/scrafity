import { MultimediaBoard } from "@/components/media/multimedia-board";
import { buscarMedia } from "@/server/media";

export const dynamic = "force-dynamic";

export default async function MultimediaPage() {
  const inicial = await buscarMedia("");
  return <MultimediaBoard inicial={inicial} />;
}
