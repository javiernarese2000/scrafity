import { Settings } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function AjustesPage() {
  return (
    <EmptyState
      icon={Settings}
      title="Ajustes"
      description="Equipo y roles, proveedores de IA, plantillas de prompt y preferencias de la plataforma."
      proximamente
    />
  );
}
