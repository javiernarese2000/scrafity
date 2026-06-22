"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

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
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const color = (data?.color as string) ?? "var(--color-brand)";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: color, strokeWidth: 2, opacity: 0.45 }}
      />
      <circle r={4} fill={color}>
        <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
      </circle>
      <circle r={8} fill={color} opacity={0.18}>
        <animateMotion dur="2.4s" repeatCount="indefinite" path={path} />
      </circle>
    </>
  );
}

export const edgeTypes = { pulse: PulseEdge };
