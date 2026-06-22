"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

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
    | ((ev: { clientX: number; clientY: number }) => void)
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
        <button
          type="button"
          title="Opciones de la conexión"
          onClick={(e) => {
            e.stopPropagation();
            onMenu?.(e);
          }}
          className="nodrag nopan rounded-full transition-transform hover:scale-125"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            width: 15,
            height: 15,
            background: color,
            border: "2px solid var(--color-surface)",
            opacity: dim ? 0.3 : 1,
            boxShadow: hasFiltros
              ? `0 0 0 4px color-mix(in oklab, ${color} 30%, transparent)`
              : "none",
            cursor: "pointer",
          }}
        />
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = { pulse: PulseEdge };
