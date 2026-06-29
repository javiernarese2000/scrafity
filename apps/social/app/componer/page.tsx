import { ComponerBoard } from "@/components/componer/componer-board";
import { listarCuentasPorCliente } from "@/server/cuentas";
import { listarRenders } from "@/server/render";

export default async function ComponerPage() {
  const [clientes, todos] = await Promise.all([
    listarCuentasPorCliente(),
    listarRenders(),
  ]);
  // Solo los videos terminados sirven para publicar.
  const renders = todos.filter((r) => r.estado === "listo" && r.outputUrl);
  return <ComponerBoard clientes={clientes} renders={renders} />;
}
