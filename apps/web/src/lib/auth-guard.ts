import { redirect } from "next/navigation";

import { esAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Guarda de página admin: si el usuario no es admin, lo manda al inicio.
 * Esconder el ítem del menú no alcanza — sin esto, un editor entra por URL.
 */
export async function requireAdmin() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!esAdmin(user)) redirect("/");
}
