import { redirect } from "next/navigation";

import { AuditoriaBoard } from "@/components/auditoria/auditoria-board";
import { esAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { listarAuditoria } from "@/server/auditoria";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!esAdmin(user)) redirect("/");

  const eventos = await listarAuditoria();
  return <AuditoriaBoard inicial={eventos} />;
}
