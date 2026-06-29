import { redirect } from "next/navigation";

import { UsuariosBoard } from "@/components/usuarios/usuarios-board";
import { esAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { listarUsuarios } from "@/server/usuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  // Solo administradores: un moderador que entre a la URL directa vuelve al inicio.
  if (!esAdmin(user)) redirect("/");

  const usuarios = await listarUsuarios();
  return <UsuariosBoard usuarios={usuarios} currentUserId={user?.id ?? null} />;
}
