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
  const dim = data?.dim === true;

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
    </>
  );
}

export const edgeTypes = { pulse: PulseEdge };
