import { AjustesForm } from "@/components/ajustes/ajustes-form";
import { requireAdmin } from "@/lib/auth-guard";
import { estadoProveedores, getAjustes } from "@/server/ajustes";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  await requireAdmin();
  const [config, proveedores] = await Promise.all([
    getAjustes(),
    estadoProveedores(),
  ]);
  return <AjustesForm config={config} proveedores={proveedores} />;
}
