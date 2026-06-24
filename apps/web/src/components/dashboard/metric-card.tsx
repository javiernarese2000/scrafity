import type { LucideIcon } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  spark,
  color = "var(--color-brand)",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  spark?: number[];
  color?: string;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs tracking-wide text-muted">{label}</p>
          <p className="mt-2 font-mono text-[1.6rem] font-medium leading-none tracking-tight text-fg">
            {value}
          </p>
          {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
        </div>
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated"
          style={{ color }}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-4 pt-1">
          <Sparkline data={spark} color={color} />
        </div>
      )}
    </Card>
  );
}
