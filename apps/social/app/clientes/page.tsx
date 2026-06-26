import { ClientesBoard } from "@/components/clientes/clientes-board";
import { listarClientes } from "@/server/clientes";

export default async function ClientesPage() {
  const clientes = await listarClientes();
  return <ClientesBoard inicial={clientes} />;
}
