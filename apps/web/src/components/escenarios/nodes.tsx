"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe, Radio, Send, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";

const COLOR_FUENTE = "var(--color-success)";
const COLOR_DESTINO = "var(--color-accent)";
const COLOR_ESCENARIO = "var(--color-brand)";

const estadoColor: Record<string, string> = {
  activa: "var(--color-success)",
  pausada: "var(--color-muted)",
  error: "var(--color-danger)",
};

const tipoFuente: Record<string, string> = { rss: "RSS", api: "API", url: "URL" };

function handle(color: string) {
  return {
    width: 11,
    height: 11,
    background: color,
    border: "2px solid var(--color-surface)",
  };
}

function tint(color: string) {
  return `color-mix(in oklab, ${color} 15%, transparent)`;
}

export function FuenteNode({ data, selected }: NodeProps) {
  const d = data as { nombre: string; tipo: string; estado: string };
  return (
    <div
      className={cn(
        "relative w-44 rounded-[var(--radius)] border bg-surface py-3 pl-5 pr-3.5 shadow-soft",
        selected ? "border-fg/30" : "border-line/70",
      )}
    >
      <span
        className="absolute bottom-3 left-1.5 top-3 w-1 rounded-full"
        style={{ background: COLOR_FUENTE }}
      />
      <div className="flex items-center gap-2">
        <span
          className="grid size-6 place-items-center rounded-md"
          style={{ background: tint(COLOR_FUENTE), color: COLOR_FUENTE }}
        >
          <Radio className="size-3.5" />
        </span>
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: estadoColor[d.estado] ?? "var(--color-muted)" }}
        />
        <span className="ml-auto rounded-md bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {tipoFuente[d.tipo] ?? d.tipo}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-fg">{d.nombre}</p>
      <Handle type="source" position={Position.Right} style={handle(COLOR_FUENTE)} />
    </div>
  );
}

export function DestinoNode({ data, selected }: NodeProps) {
  const d = data as { nombre: string; tipo: string };
  const esWp = d.tipo === "wordpress_cliente";
  return (
    <div
      className={cn(
        "relative w-44 rounded-[var(--radius)] border bg-surface py-3 pl-5 pr-3.5 shadow-soft",
        selected ? "border-fg/30" : "border-line/70",
      )}
    >
      <span
        className="absolute bottom-3 left-1.5 top-3 w-1 rounded-full"
        style={{ background: COLOR_DESTINO }}
      />
      <div className="flex items-center gap-2">
        <span
          className="grid size-6 place-items-center rounded-md"
          style={{ background: tint(COLOR_DESTINO), color: COLOR_DESTINO }}
        >
          {esWp ? <Globe className="size-3.5" /> : <Send className="size-3.5" />}
        </span>
        <span className="ml-auto rounded-md bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {esWp ? "WordPress" : "Sitio propio"}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium text-fg">{d.nombre}</p>
      <Handle type="target" position={Position.Left} style={handle(COLOR_DESTINO)} />
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
        "w-56 rounded-[var(--radius-lg)] border bg-surface shadow-float",
        selected ? "border-brand ring-2 ring-brand/30" : "border-line",
        !d.activo && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5">
        <span
          className="grid size-6 place-items-center rounded-md"
          style={{ background: tint(COLOR_ESCENARIO), color: COLOR_ESCENARIO }}
        >
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
      <Handle type="target" position={Position.Left} style={handle(COLOR_ESCENARIO)} />
      <Handle type="source" position={Position.Right} style={handle(COLOR_ESCENARIO)} />
    </div>
  );
}

export const nodeTypes = {
  fuente: FuenteNode,
  escenario: EscenarioNode,
  destino: DestinoNode,
};
