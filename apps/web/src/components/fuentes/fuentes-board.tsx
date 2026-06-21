"use client";

import { Pause, Play, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { fuentesData, type Fuente, type FuenteEstado } from "@/data/fuentes";

const estadoColor: Record<FuenteEstado, string> = {
  activa: "var(--color-success)",
  pausada: "var(--color-muted)",
  error: "var(--color-danger)",
};

export function FuentesBoard() {
  const [fuentes, setFuentes] = useState<Fuente[]>(fuentesData);
  const { message, show } = useToast();

  const activas = fuentes.filter((f) => f.estado === "activa").length;
  const conError = fuentes.filter((f) => f.estado === "error").length;

  function toggle(f: Fuente) {
    if (f.estado === "error") {
      show(`Reintentando conexión con ${f.nombre}…`);
      return;
    }
    const nuevo: FuenteEstado = f.estado === "activa" ? "pausada" : "activa";
    setFuentes((prev) =>
      prev.map((x) => (x.id === f.id ? { ...x, estado: nuevo } : x)),
    );
    show(`${f.nombre} ${nuevo === "activa" ? "activada" : "pausada"}`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Fuentes"
        subtitle="Feeds RSS, APIs y URLs desde donde se ingieren las notas."
        action={
          <Button onClick={() => show("Alta de fuente — próximamente")}>
            <Plus className="size-4" />
            Agregar fuente
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Total" value={String(fuentes.length)} />
        <Stat label="Activas" value={String(activas)} />
        <Stat label="Con error" value={String(conError)} />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-line/60">
          {fuentes.map((f) => (
            <div key={f.id} className="flex items-center gap-4 p-4">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: estadoColor[f.estado] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">
                  {f.nombre}
                </p>
                <p className="truncate font-mono text-xs text-muted">{f.url}</p>
              </div>
              <Badge className="hidden sm:inline-flex">{f.tipo}</Badge>
              <div className="hidden w-24 text-right md:block">
                <p className="font-mono text-sm text-fg">
                  {f.ingestadas.toLocaleString("es")}
                </p>
                <p className="text-xs text-muted">ingestadas</p>
              </div>
              <span className="hidden w-20 text-right text-xs text-muted lg:block">
                {f.ultimaLectura}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggle(f)}
                className={cn(f.estado === "error" && "text-danger")}
                aria-label={
                  f.estado === "error"
                    ? "Reintentar"
                    : f.estado === "activa"
                      ? "Pausar"
                      : "Activar"
                }
              >
                {f.estado === "error" ? (
                  <RefreshCw className="size-4" />
                ) : f.estado === "activa" ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Toast message={message} />
    </div>
  );
}
