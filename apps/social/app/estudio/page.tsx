import { EstudioBoard } from "@/components/estudio/estudio-board";
import { listarCuentasPorCliente } from "@/server/cuentas";

export default async function EstudioPage() {
  const clientes = await listarCuentasPorCliente();
  return <EstudioBoard clientes={clientes} />;
}
