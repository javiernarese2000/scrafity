"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Plus } from "lucide-react";

export function PulseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const color = (data?.color as string) ?? "var(--color-brand)";
  const dim = data?.dim === true;
  const keywords = (data?.keywords as string[]) ?? [];
  const hasFiltros = keywords.length > 0;
  const onMenu = data?.onMenu as
    | ((id: string, ev: { clientX: number; clientY: number }) => void)
    | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: 2,
          opacity: dim ? 0.08 : 0.45,
          transition: "opacity .2s",
        }}
      />
      <circle r={4} fill={color} opacity={dim ? 0.12 : 1}>
        <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
      </circle>
      {!dim && (
        <circle r={8} fill={color} opacity={0.18}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
        </circle>
      )}

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            opacity: dim ? 0.3 : 1,
          }}
        >
          <button
            type="button"
            title="Opciones de la conexión"
            onClick={(e) => {
              e.stopPropagation();
              onMenu?.(id, e);
            }}
            className="grid place-items-center rounded-full border-2 transition-colors hover:brightness-95"
            style={{
              width: 20,
              height: 20,
              borderColor: color,
              background: hasFiltros ? color : "var(--color-surface)",
              color: hasFiltros ? "var(--color-surface)" : color,
              cursor: "pointer",
            }}
          >
            <Plus style={{ width: 12, height: 12 }} strokeWidth={3} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = { pulse: PulseEdge };
