import { Newspaper } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function ModeracionPage() {
  return (
    <EmptyState
      icon={Newspaper}
      title="Cola de moderación"
      description="Revisá, editá y aprobá las versiones generadas por IA con el diff contra el original antes de publicarlas."
    />
  );
}
