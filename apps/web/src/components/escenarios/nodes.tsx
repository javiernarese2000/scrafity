"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe, Radio, Send, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";

const handleStyle = {
  width: 11,
  height: 11,
  background: "var(--color-brand)",
  border: "2px solid var(--color-surface)",
};

const estadoColor: Record<string, string> = {
  activa: "var(--color-success)",
  pausada: "var(--color-muted)",
  error: "var(--color-danger)",
};

const tipoFuente: Record<string, string> = { rss: "RSS", api: "API", url: "URL" };

export function FuenteNode({ data, selected }: NodeProps) {
  const d = data as { nombre: string; tipo: string; estado: string };
  return (
    <div
      className={cn(
        "w-44 rounded-[var(--radius)] border bg-surface px-3.5 py-3 shadow-soft transition-shadow",
        selected ? "border-brand" : "border-line/70",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: estadoColor[d.estado] ?? "var(--color-muted)" }}
        />
        <Radio className="size-3.5 text-muted" />
        <span className="ml-auto rounded-md bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {tipoFuente[d.tipo] ?? d.tipo}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-fg">{d.nombre}</p>
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export function DestinoNode({ data, selected }: NodeProps) {
  const d = data as { nombre: string; tipo: string };
  const esWp = d.tipo === "wordpress_cliente";
  return (
    <div
      className={cn(
        "w-44 rounded-[var(--radius)] border bg-surface px-3.5 py-3 shadow-soft transition-shadow",
        selected ? "border-brand" : "border-line/70",
      )}
    >
      <div className="flex items-center gap-2">
        {esWp ? (
          <Globe className="size-3.5 text-muted" />
        ) : (
          <Send className="size-3.5 text-muted" />
        )}
        <span className="ml-auto rounded-md bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {esWp ? "WordPress" : "Sitio propio"}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-fg">{d.nombre}</p>
      <Handle type="target" position={Position.Left} style={handleStyle} />
    </div>
  );
}

export function EscenarioNode({ data, selected }: NodeProps) {
  const d = data as {
    nombre: string;
    tema: string | null;
    nVersiones: number;
    tono: string;
    moderacion: boolean;
    activo: boolean;
  };
  return (
    <div
      className={cn(
        "w-56 rounded-[var(--radius-lg)] border bg-surface shadow-float transition-shadow",
        selected ? "border-brand ring-2 ring-brand/30" : "border-line",
        !d.activo && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
        <span className="grid size-6 place-items-center rounded-md bg-brand/15 text-brand">
          <Sparkles className="size-3.5" />
        </span>
        <p className="truncate text-sm font-medium text-fg">{d.nombre}</p>
        <span
          className="ml-auto size-2 rounded-full"
          style={{
            backgroundColor: d.activo
              ? "var(--color-success)"
              : "var(--color-muted)",
          }}
        />
      </div>
      <div className="space-y-1.5 px-4 py-3 text-xs text-muted">
        <p>{d.tema ? `tema: ${d.tema}` : "sin condición"}</p>
        <p className="font-mono text-fg">
          {d.nVersiones} versiones · {d.tono}
        </p>
        <p>{d.moderacion ? "requiere moderación" : "auto-publica"}</p>
      </div>
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export const nodeTypes = {
  fuente: FuenteNode,
  escenario: EscenarioNode,
  destino: DestinoNode,
};
