import { UsuariosBoard } from "@/components/usuarios/usuarios-board";
import { createClient } from "@/lib/supabase/server";
import { listarUsuarios } from "@/server/usuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sb = await createClient();
  const [usuarios, { data }] = await Promise.all([
    listarUsuarios(),
    sb.auth.getUser(),
  ]);
  return (
    <UsuariosBoard usuarios={usuarios} currentUserId={data.user?.id ?? null} />
  );
}
