import { wordDiff, type DiffSeg } from "@/lib/diff";
import { cn } from "@/lib/cn";

function Column({
  label,
  labelClass,
  segs,
  hide,
  mark,
}: {
  label: string;
  labelClass: string;
  segs: DiffSeg[];
  hide: DiffSeg["type"];
  mark: DiffSeg["type"];
}) {
  return (
    <div className="rounded-[var(--radius)] bg-elevated/60 p-4">
      <p
        className={cn(
          "mb-2 font-mono text-[11px] uppercase tracking-widest",
          labelClass,
        )}
      >
        {label}
      </p>
      <p className="text-[15px] leading-relaxed text-fg">
        {segs
          .filter((s) => s.type !== hide)
          .map((s, i) => (
            <span
              key={i}
              className={cn(
                s.type === mark && mark === "removed" &&
                  "rounded bg-danger/12 text-danger line-through decoration-danger/50",
                s.type === mark && mark === "added" &&
                  "rounded bg-success/15 text-success",
              )}
            >
              {s.text}{" "}
            </span>
          ))}
      </p>
    </div>
  );
}

export function DiffView({
  original,
  revised,
}: {
  original: string;
  revised: string;
}) {
  const segs = wordDiff(original, revised);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Column
        label="Original"
        labelClass="text-muted"
        segs={segs}
        hide="added"
        mark="removed"
      />
      <Column
        label="Versión IA"
        labelClass="text-accent"
        segs={segs}
        hide="removed"
        mark="added"
      />
    </div>
  );
}
