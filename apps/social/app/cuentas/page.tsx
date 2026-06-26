import { CuentasBoard } from "@/components/cuentas/cuentas-board";
import { listarCuentasPorCliente } from "@/server/cuentas";

export default async function CuentasPage() {
  const clientes = await listarCuentasPorCliente();
  return <CuentasBoard clientes={clientes} />;
}
