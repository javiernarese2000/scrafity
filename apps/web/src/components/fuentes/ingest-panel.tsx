"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DownloadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { IngestAnimation } from "./ingest-animation";
import {
  estadoIngesta,
  iniciarIngesta,
  ultimaIngesta,
  type EstadoIngesta,
} from "@/server/fuentes";
import type { FuenteProgreso } from "@scrapify/db";

const dot: Record<FuenteProgreso["estado"], string> = {
  pendiente: "var(--color-muted)",
  corriendo: "var(--color-brand)",
  ok: "var(--color-success)",
  error: "var(--color-danger)",
};

function AnimatedNumber({ value }: { value: number }) {
  return (
    <span className="relative inline-block font-mono text-2xl font-medium text-fg tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-line/60 bg-elevated/40 px-4 py-3">
      <div style={color ? { color } : undefined}>
        <AnimatedNumber value={value} />
      </div>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function transcurrido(desde: string, hasta: string | null, now: number): string {
  const ms = (hasta ? new Date(hasta).getTime() : now) - new Date(desde).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function IngestPanel() {
  const router = useRouter();
  const [run, setRun] = useState<EstadoIngesta | null>(null);
  const [starting, setStarting] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const runId = run?.id ?? null;
  const corriendo = run?.estado === "corriendo";

  // Última corrida al montar. La animación solo se muestra si quedó una corrida
  // en curso (reload mientras ingiere); si no, aparece recién al presionar.
  useEffect(() => {
    ultimaIngesta().then((r) => {
      if (!r) return;
      setRun(r);
      if (r.estado === "corriendo") setIniciado(true);
    });
  }, []);

  // Polling mientras corre.
  useEffect(() => {
    if (!runId || !corriendo) return;
    const t = setInterval(async () => {
      const r = await estadoIngesta(runId);
      if (r) setRun(r);
      if (r && r.estado !== "corriendo") {
        clearInterval(t);
        router.refresh();
      }
    }, 1500);
    return () => clearInterval(t);
  }, [runId, corriendo, router]);

  // Reloj en vivo.
  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [corriendo]);

  async function start() {
    setStarting(true);
    setIniciado(true);
    try {
      const { runId } = await iniciarIngesta();
      const r = await estadoIngesta(runId);
      setNow(Date.now());
      setRun(r);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <Button onClick={start} disabled={starting || corriendo} variant="outline">
          {corriendo || starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <DownloadCloud className="size-4" />
          )}
          {corriendo ? "Ingiriendo…" : starting ? "Iniciando…" : "Ingestar ahora"}
        </Button>
        {run && (
          <span className="text-xs text-muted">
            {corriendo ? "en curso" : "última corrida"} ·{" "}
            {transcurrido(run.startedAt, run.finishedAt, now)}
          </span>
        )}
      </div>

      <AnimatePresence>
        {run && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden p-5">
              {iniciado && (
                <IngestAnimation activo={corriendo} nuevas={run.nuevas} />
              )}
              <div className="grid grid-cols-3 gap-3">
                <Tile
                  label="Nuevas → Entrada"
                  value={run.nuevas}
                  color="var(--color-brand)"
                />
                <Tile label="Salteadas" value={run.saltadas} />
                <Tile
                  label="Errores"
                  value={run.errores.length}
                  color={run.errores.length ? "var(--color-danger)" : undefined}
                />
              </div>

              {run.fuentes.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {run.fuentes.map((f) => (
                    <li
                      key={f.nombre}
                      className="flex items-center gap-3 rounded-[var(--radius)] border border-line/50 px-3 py-2"
                    >
                      <motion.span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dot[f.estado] }}
                        animate={
                          f.estado === "corriendo"
                            ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                            : {}
                        }
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">
                        {f.nombre}
                      </span>
                      <span className="font-mono text-xs text-muted tabular-nums">
                        {f.nuevas} nuevas
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {run.errores.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {run.errores.map((e, i) => (
                    <li key={i} className="text-xs text-danger">
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
