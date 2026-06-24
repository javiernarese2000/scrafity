import { AjustesForm } from "@/components/ajustes/ajustes-form";
import { estadoProveedores, getAjustes } from "@/server/ajustes";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [config, proveedores] = await Promise.all([
    getAjustes(),
    estadoProveedores(),
  ]);
  return <AjustesForm config={config} proveedores={proveedores} />;
}
