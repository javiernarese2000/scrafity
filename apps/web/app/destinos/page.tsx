import { Send } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function DestinosPage() {
  return (
    <EmptyState
      icon={Send}
      title="Destinos"
      description="Gestioná los sitios destino: WordPress de clientes (vía API) y tus sitios propios headless que consumen el feed."
    />
  );
}
