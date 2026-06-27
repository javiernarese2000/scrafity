import { RendersBoard } from "@/components/renders/renders-board";
import { listarCuentasPorCliente } from "@/server/cuentas";
import { listarRenders } from "@/server/render";

export default async function RendersPage() {
  const [inicial, clientes] = await Promise.all([
    listarRenders(),
    listarCuentasPorCliente(),
  ]);
  return <RendersBoard inicial={inicial} clientes={clientes} />;
}
