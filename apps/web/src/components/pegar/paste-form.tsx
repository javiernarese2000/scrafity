"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Link2, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { proveedores, tonos } from "@/data/pegar";
import { extraerNota, generarVersiones } from "@/server/notas";
import type { ProviderName } from "@/ai";

const provMap: Record<string, ProviderName | "auto"> = {
  Auto: "auto",
  DeepSeek: "deepseek",
  Claude: "claude",
};

type Extracted = { titulo: string; contenido: string; fuente: string };

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
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [extracting, startExtract] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nVersiones, setNVersiones] = useState(3);
  const [tono, setTono] = useState<string>("Neutro");
  const [proveedor, setProveedor] = useState<string>("Claude");

  function extraer() {
    if (!url.trim()) return;
    setError(null);
    startExtract(async () => {
      const res = await extraerNota(url.trim());
      if (!res.ok) {
        setExtracted(null);
        setError(res.error);
        return;
      }
      setExtracted({
        titulo: res.titulo,
        contenido: res.contenido,
        fuente: res.fuente,
      });
    });
  }

  function generar() {
    if (!extracted) return;
    setError(null);
    startGenerate(async () => {
      try {
        await generarVersiones({
          url: url.trim(),
          fuente: extracted.fuente,
          titulo: extracted.titulo,
          contenido: extracted.contenido,
          nVersiones,
          tono,
          proveedor: provMap[proveedor] ?? "claude",
        });
        router.push("/moderacion");
      } catch {
        setError("Falló la generación. Revisá la API key del proveedor.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
          Pegar URL
        </h2>
        <p className="mt-1 text-sm text-muted">
          Extraé una nota y generá versiones reescritas con IA para moderar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                      setExtracted(null);
                    }}
                    placeholder="https://medio.com/nota…"
                    className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                  />
                </div>
                <Button onClick={extraer} disabled={!url.trim() || extracting}>
                  {extracting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Extraer"
                  )}
                </Button>
              </div>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            </CardBody>
          </Card>

          <AnimatePresence>
            {extracted && (
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
                      <p className="mt-2 text-xs text-muted">
                        DeepSeek requiere su API key; sin ella se usa Claude.
                      </p>
                    </div>
                  </CardBody>
                </Card>

                <Button
                  onClick={generar}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generando {nVersiones}{" "}
                      {nVersiones === 1 ? "versión" : "versiones"}…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generar {nVersiones}{" "}
                      {nVersiones === 1 ? "versión" : "versiones"}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="min-h-[24rem]">
            {!extracted ? (
              <div className="flex min-h-[24rem] flex-col items-center justify-center p-8 text-center">
                {extracting ? (
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
                <Badge tone="accent">{extracted.fuente}</Badge>
                <h3 className="mt-3 font-display text-2xl font-medium leading-tight text-fg">
                  {extracted.titulo}
                </h3>
                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-fg">
                  {extracted.contenido.slice(0, 1400)}
                  {extracted.contenido.length > 1400 ? "…" : ""}
                </p>
                <p className="mt-5 border-t border-line/70 pt-3 font-mono text-xs text-muted">
                  {extracted.contenido.split(/\s+/).filter(Boolean).length}{" "}
                  palabras extraídas
                </p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
