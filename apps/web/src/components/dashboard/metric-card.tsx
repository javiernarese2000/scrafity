import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function MetricCard({
  label,
  value,
  delta,
  trend,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  hint?: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-xs tracking-wide text-muted">{label}</p>
      <p className="mt-2.5 font-mono text-[1.75rem] font-medium tracking-tight text-fg">
        {value}
      </p>
      {(delta || hint) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {delta && trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                trend === "up" ? "text-success" : "text-danger",
              )}
            >
              {trend === "up" ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {delta}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
