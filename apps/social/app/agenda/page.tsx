import { PlanificadorBoard } from "@/components/planificador/planificador-board";
import { listarCuentasPorCliente } from "@/server/cuentas";

export default async function AgendaPage() {
  const clientes = await listarCuentasPorCliente();
  return <PlanificadorBoard clientes={clientes} />;
}
