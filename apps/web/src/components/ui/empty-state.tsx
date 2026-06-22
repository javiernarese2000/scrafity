import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  proximamente = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  proximamente?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface text-muted">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-medium text-fg">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {proximamente && (
        <span className="mt-4 font-mono text-[11px] uppercase tracking-widest text-accent">
          Próximamente
        </span>
      )}
    </div>
  );
}
