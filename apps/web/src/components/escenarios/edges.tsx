"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Filter, X } from "lucide-react";

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
  const onFilter = data?.onFilter as (() => void) | undefined;
  const onDelete = data?.onDelete as (() => void) | undefined;

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
          className="group nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            opacity: dim ? 0.25 : 1,
          }}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onFilter}
              title="Filtro de keywords"
              className="flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-[11px] shadow-soft transition-colors hover:bg-elevated"
              style={{
                color: keywords.length ? color : "var(--color-muted)",
              }}
            >
              <Filter className="size-3" />
              {keywords.length > 0 && (
                <span className="font-medium">{keywords.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Quitar conexión"
              className="grid size-6 place-items-center rounded-full border border-line bg-surface text-muted opacity-0 shadow-soft transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = { pulse: PulseEdge };
