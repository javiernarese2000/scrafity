import type { BadgeProps } from "@/components/ui/badge";

type Tone = NonNullable<BadgeProps["tone"]>;

// Score de similitud vs original → riesgo de plagio (ver memory/06-robustez.md).
export function simTone(score: number): { tone: Tone; label: string } {
  if (score < 0.25) return { tone: "success", label: "bajo" };
  if (score < 0.45) return { tone: "warning", label: "medio" };
  return { tone: "danger", label: "alto" };
}

export function pct(score: number) {
  return `${Math.round(score * 100)}%`;
}
