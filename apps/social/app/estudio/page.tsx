import { EstudioBoard } from "@/components/estudio/estudio-board";
import { listarCuentasPorCliente } from "@/server/cuentas";
import { listarPlantillas } from "@/server/plantillas";

export default async function EstudioPage() {
  const [clientes, plantillas] = await Promise.all([
    listarCuentasPorCliente(),
    listarPlantillas(),
  ]);
  return <EstudioBoard clientes={clientes} plantillasIniciales={plantillas} />;
}
