"use client";

import { Pause, Play, Plus, RefreshCw, Radio, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  createFuente,
  deleteFuente,
  setFuenteEstado,
  type FuenteEstado,
  type FuenteTipo,
} from "@/server/fuentes";
import { IngestPanel } from "./ingest-panel";

export type FuenteRow = {
  id: string;
  nombre: string;
  tipo: FuenteTipo;
  url: string;
  estado: FuenteEstado;
  ultimaLectura: string;
  ingestadas: number;
};

const estadoColor: Record<FuenteEstado, string> = {
  activa: "var(--color-success)",
  pausada: "var(--color-muted)",
  error: "var(--color-danger)",
};

const tipoLabel: Record<FuenteTipo, string> = {
  rss: "RSS",
  api: "API",
  url: "URL",
};

export function FuentesBoard({ fuentes }: { fuentes: FuenteRow[] }) {
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<FuenteTipo>("rss");
  const [url, setUrl] = useState("");

  const activas = fuentes.filter((f) => f.estado === "activa").length;
  const conError = fuentes.filter((f) => f.estado === "error").length;

  function toggle(f: FuenteRow) {
    const nuevo: FuenteEstado =
      f.estado === "error" ? "activa" : f.estado === "activa" ? "pausada" : "activa";
    startTransition(async () => {
      await setFuenteEstado(f.id, nuevo);
      show(`${f.nombre} → ${nuevo}`);
    });
  }

  function remove(f: FuenteRow) {
    startTransition(async () => {
      await deleteFuente(f.id);
      show(`${f.nombre} eliminada`);
    });
  }

  function submitAdd() {
    if (!nombre.trim() || !url.trim()) return;
    startTransition(async () => {
      await createFuente({ nombre: nombre.trim(), tipo, url: url.trim() });
      setNombre("");
      setUrl("");
      setTipo("rss");
      setOpenAdd(false);
      show("Fuente agregada");
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Fuentes"
        subtitle="Feeds RSS, APIs y URLs desde donde se ingieren las notas."
        action={
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="size-4" />
            Agregar fuente
          </Button>
        }
      />

      <IngestPanel />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Total" value={String(fuentes.length)} />
        <Stat label="Activas" value={String(activas)} />
        <Stat label="Con error" value={String(conError)} />
      </div>

      {fuentes.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Sin fuentes todavía"
          description="Agregá tu primera fuente para empezar a ingerir notas."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className={cn("divide-y divide-line/60", pending && "opacity-60")}>
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
                <Badge className="hidden sm:inline-flex">
                  {tipoLabel[f.tipo]}
                </Badge>
                <div className="hidden w-24 text-right md:block">
                  <p className="font-mono text-sm text-fg">
                    {f.ingestadas.toLocaleString("es")}
                  </p>
                  <p className="text-xs text-muted">ingestadas</p>
                </div>
                <span className="hidden w-24 text-right text-xs text-muted lg:block">
                  {f.ultimaLectura}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggle(f)}
                  disabled={pending}
                  aria-label={f.estado === "activa" ? "Pausar" : "Activar"}
                >
                  {f.estado === "error" ? (
                    <RefreshCw className="size-4 text-danger" />
                  ) : f.estado === "activa" ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(f)}
                  disabled={pending}
                  aria-label="Eliminar"
                >
                  <Trash2 className="size-4 text-muted" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Agregar fuente">
        <div className="space-y-4">
          <Field label="Nombre">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="La Nación"
              className={inputCls}
            />
          </Field>
          <Field label="Tipo">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as FuenteTipo)}
              className={inputCls}
            >
              <option value="rss">RSS</option>
              <option value="api">API</option>
              <option value="url">URL</option>
            </select>
          </Field>
          <Field label="URL">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://medio.com/feed"
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpenAdd(false)}>
              Cancelar
            </Button>
            <Button onClick={submitAdd} disabled={pending}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
