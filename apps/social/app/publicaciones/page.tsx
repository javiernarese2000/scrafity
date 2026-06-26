import { PublicacionesBoard } from "@/components/publicaciones/publicaciones-board";
import { listarPublicaciones } from "@/server/publicaciones";

export default async function PublicacionesPage() {
  const publicaciones = await listarPublicaciones();
  return <PublicacionesBoard publicaciones={publicaciones} />;
}
