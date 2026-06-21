import { Radio } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function FuentesPage() {
  return (
    <EmptyState
      icon={Radio}
      title="Fuentes"
      description="Conectá feeds RSS, APIs de noticias y URLs. Monitoreá su salud y configurá la ingesta automática."
    />
  );
}
