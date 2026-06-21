"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  FileText,
  Globe,
  Link2,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  destinosDisponibles,
  proveedores,
  sampleExtract,
  tonos,
} from "@/data/pegar";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "border-brand/40 bg-brand/12 text-brand"
          : "border-line text-muted hover:bg-elevated hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function PasteForm() {
  const [url, setUrl] = useState("");
  const [estado, setEstado] = useState<"idle" | "extrayendo" | "listo">("idle");
  const [nVersiones, setNVersiones] = useState(3);
  const [tono, setTono] = useState<string>("Neutro");
  const [proveedor, setProveedor] = useState<string>("Auto");
  const [destinos, setDestinos] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const listo = estado === "listo";

  function extraer() {
    if (!url.trim()) return;
    setEstado("extrayendo");
    window.setTimeout(() => setEstado("listo"), 1200);
  }

  function toggleDestino(id: string) {
    setDestinos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function generar() {
    setToast(
      `Encolada la generación de ${nVersiones} ${
        nVersiones === 1 ? "versión" : "versiones"
      } para ${destinos.size} ${destinos.size === 1 ? "destino" : "destinos"}`,
    );
    window.setTimeout(() => setToast(null), 2800);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
          Pegar URL
        </h2>
        <p className="mt-1 text-sm text-muted">
          Extraé una nota, elegí cuántas versiones querés y a dónde van.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna de configuración */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <label className="text-xs text-muted">URL de la nota</label>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3">
                  <Link2 className="size-4 shrink-0 text-muted" />
                  <input
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (estado === "listo") setEstado("idle");
                    }}
                    placeholder="https://medio.com/nota…"
                    className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                  />
                </div>
                <Button
                  onClick={extraer}
                  disabled={!url.trim() || estado === "extrayendo"}
                >
                  {estado === "extrayendo" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Extraer"
                  )}
                </Button>
              </div>
            </CardBody>
          </Card>

          <AnimatePresence>
            {listo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Configuración</CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-5">
                    <div>
                      <p className="mb-2 text-xs text-muted">
                        Cantidad de versiones
                      </p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Chip
                            key={n}
                            active={nVersiones === n}
                            onClick={() => setNVersiones(n)}
                          >
                            {n}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-muted">Tono</p>
                      <div className="flex flex-wrap gap-2">
                        {tonos.map((t) => (
                          <Chip
                            key={t}
                            active={tono === t}
                            onClick={() => setTono(t)}
                          >
                            {t}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-muted">Proveedor de IA</p>
                      <div className="flex rounded-lg border border-line p-0.5">
                        {proveedores.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setProveedor(p)}
                            className={cn(
                              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                              proveedor === p
                                ? "bg-elevated text-fg"
                                : "text-muted hover:text-fg",
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Destinos</CardTitle>
                    <Badge>{destinos.size} seleccionados</Badge>
                  </CardHeader>
                  <CardBody className="space-y-2">
                    {destinosDisponibles.map((d) => {
                      const sel = destinos.has(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDestino(d.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[var(--radius)] border p-3 text-left transition-colors",
                            sel
                              ? "border-brand/40 bg-brand/8"
                              : "border-line hover:bg-elevated/60",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-lg",
                              sel
                                ? "bg-brand/15 text-brand"
                                : "bg-elevated text-muted",
                            )}
                          >
                            {d.tipo === "wordpress_cliente" ? (
                              <Globe className="size-4" />
                            ) : (
                              <Send className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-fg">
                              {d.nombre}
                            </p>
                            <p className="text-xs text-muted">
                              {d.tipo === "wordpress_cliente"
                                ? "WordPress · cliente"
                                : "Sitio propio · headless"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "ml-auto grid size-5 place-items-center rounded-full border transition-colors",
                              sel
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-line",
                            )}
                          >
                            {sel && <Check className="size-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </CardBody>
                </Card>

                <Button
                  onClick={generar}
                  disabled={destinos.size === 0}
                  className="w-full"
                  size="md"
                >
                  <Sparkles className="size-4" />
                  Generar {nVersiones}{" "}
                  {nVersiones === 1 ? "versión" : "versiones"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Columna de preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="min-h-[24rem]">
            {!listo ? (
              <div className="flex min-h-[24rem] flex-col items-center justify-center p-8 text-center">
                {estado === "extrayendo" ? (
                  <>
                    <Loader2 className="size-7 animate-spin text-brand" />
                    <p className="mt-4 text-sm text-muted">
                      Extrayendo contenido…
                    </p>
                  </>
                ) : (
                  <>
                    <span className="grid size-12 place-items-center rounded-2xl border border-line text-muted">
                      <FileText className="size-5" />
                    </span>
                    <p className="mt-4 text-sm text-muted">
                      Pegá una URL y extraé el contenido para verlo acá.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <CardBody>
                <div className="mb-3 flex items-center gap-2">
                  <Badge tone="accent">{sampleExtract.fuente}</Badge>
                  <span className="text-xs text-muted">
                    {sampleExtract.autor} · {sampleExtract.fecha}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-medium leading-tight text-fg">
                  {sampleExtract.titulo}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-fg">
                  {sampleExtract.contenido}
                </p>
                <p className="mt-5 border-t border-line/70 pt-3 font-mono text-xs text-muted">
                  {sampleExtract.contenido.split(/\s+/).length} palabras
                  extraídas
                </p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-float"
          >
            <Sparkles className="size-4 text-accent" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
