import { Link2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function PegarPage() {
  return (
    <EmptyState
      icon={Link2}
      title="Pegar URL"
      description="Pegá la URL de una nota, elegí cuántas versiones querés y el tono, y la IA genera los borradores para moderar."
    />
  );
}
