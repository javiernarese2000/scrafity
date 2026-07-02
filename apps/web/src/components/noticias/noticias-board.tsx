"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarPlus,
  Check,
  Columns2,
  DownloadCloud,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Inbox,
  Pencil,
  RotateCw,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DiffView } from "@/components/moderacion/diff-view";
import { TraerDialog, type FuenteLite } from "@/components/noticias/traer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/ui/modal";
import { Markdown } from "@/components/ui/markdown";
import { Toast, useToast } from "@/components/ui/toast";
import {
  descartarNota,
  prepararNota,
  programarNota,
  reextraerNota,
  regenerarNota,
  type NotaPreparada,
} from "@/server/noticias";

const TONOS = ["Neutro", "Formal", "Cercano", "Dinámico", "Serio"];
type Proveedor = "auto" | "deepseek" | "claude";

export type NotaFeed = {
  id: string;
  titulo: string;
  fuente: string;
  categoria: string | null;
  resumen: string;
  imagenUrl: string | null;
  urlOriginal: string;
  fecha: string;
};

type Destino = { id: string; nombre: string; categorias: string[] };
type Vista = "diff" | "editar" | "limpio";

function proxHora() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function NoticiasBoard({
  notas,
  destinos,
  fuentes,
  categorias,
}: {
  notas: NotaFeed[];
  destinos: Destino[];
  fuentes: FuenteLite[];
  categorias: string[];
}) {
  const router = useRouter();
  const { message, show } = useToast();
  const [pending, startTransition] = useTransition();
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [traerOpen, setTraerOpen] = useState(false);

  // Panel Programar (fullscreen)
  const [activa, setActiva] = useState<NotaFeed | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [prep, setPrep] = useState<NotaPreparada | null>(null);
  const [vista, setVista] = useState<Vista>("diff");
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [imgInput, setImgInput] = useState("");
  const [sitios, setSitios] = useState<Set<string>>(new Set());
  const [fecha, setFecha] = useState(() => ymd(proxHora()));
  const [horaStr, setHoraStr] = useState(() => hm(proxHora()));
  const [tono, setTono] = useState("Neutro");
  const [proveedor, setProveedor] = useState<Proveedor>("auto");
  const [regenerando, setRegenerando] = useState(false);

  const visibles = notas.filter((n) => !ocultas.has(n.id));

  async function abrirProgramar(nota: NotaFeed) {
    setActiva(nota);
    setPrep(null);
    setPreparando(true);
    setVista("diff");
    const p = proxHora();
    setFecha(ymd(p));
    setHoraStr(hm(p));
    try {
      const r = await prepararNota(nota.id);
      setPrep(r);
      setTitulo(r.titulo);
      setContenido(r.contenido);
      setImagenUrl(r.imagenUrl);
      setImgInput("");
      setSitios(new Set(r.destinosSugeridos));
    } catch (e) {
      show(e instanceof Error ? e.message : "No se pudo preparar la nota.");
      setActiva(null);
    } finally {
      setPreparando(false);
    }
  }

  function toggleSitio(id: string) {
    setSitios((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function regenerar() {
    if (!activa) return;
    setRegenerando(true);
    try {
      const r = await regenerarNota(activa.id, { tono, proveedor });
      setPrep(r);
      setTitulo(r.titulo);
      setContenido(r.contenido);
      setVista("diff");
      show("Nota regenerada");
    } catch (e) {
      show(e instanceof Error ? e.message : "No se pudo regenerar.");
    } finally {
      setRegenerando(false);
    }
  }

  function programar() {
    if (!activa || !prep) return;
    if (sitios.size === 0) return show("Elegí al menos un sitio.");
    const [y, m, d] = fecha.split("-").map(Number);
    const [hh, mm] = horaStr.split(":").map(Number);
    const iso = new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 9, mm ?? 0).toISOString();
    const id = activa.id;
    startTransition(async () => {
      try {
        await programarNota({
          articleId: id,
          versionId: prep.versionId,
          titulo,
          contenido,
          destinos: [...sitios],
          fechaISO: iso,
          imagenUrl,
        });
        setOcultas((prev) => new Set(prev).add(id));
        setActiva(null);
        show("Programada en el calendario");
        router.refresh();
      } catch (e) {
        show(e instanceof Error ? e.message : "No se pudo programar.");
      }
    });
  }

  function descartar(nota: NotaFeed) {
    setOcultas((prev) => new Set(prev).add(nota.id));
    startTransition(async () => {
      try {
        await descartarNota(nota.id);
        router.refresh();
      } catch {
        show("No se pudo descartar.");
      }
    });
  }

  function reextraer(nota: NotaFeed) {
    startTransition(async () => {
      try {
        await reextraerNota(nota.id);
        show("Contenido actualizado");
        router.refresh();
      } catch (e) {
        show(e instanceof Error ? e.message : "No se pudo re-extraer.");
      }
    });
  }

  const palabras = contenido.split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Noticias
          </h2>
          <p className="mt-1 text-sm text-muted">
            Lo que entró de tus fuentes. Elegí qué programar y a qué sitio va.
          </p>
        </div>
        <Button variant="outline" onClick={() => setTraerOpen(true)}>
          <DownloadCloud className="size-4" />
          Traer noticias
        </Button>
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-line/70 bg-surface py-20 text-center shadow-soft">
          <span className="grid size-14 place-items-center rounded-2xl border border-line bg-elevated text-muted">
            <Inbox className="size-6" />
          </span>
          <p className="mt-4 font-display text-lg font-medium text-fg">
            No hay noticias nuevas
          </p>
          <p className="mt-1 text-sm text-muted">
            Cuando tus fuentes traigan notas, van a aparecer acá.
          </p>
          <Link href="/fuentes" className="mt-4 text-sm text-accent hover:underline">
            Administrar fuentes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((n) => (
            <div
              key={n.id}
              className="flex gap-4 rounded-[var(--radius-lg)] border border-line/70 bg-surface p-4 shadow-soft"
            >
              {n.imagenUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={n.imagenUrl}
                  alt=""
                  className="hidden size-24 shrink-0 rounded-lg object-cover sm:block"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <span className="font-medium text-fg/80">{n.fuente}</span>
                  <span>·</span>
                  <span>{n.fecha}</span>
                  {n.categoria && (
                    <Badge tone="neutral" className="ml-1">
                      {n.categoria}
                    </Badge>
                  )}
                </div>
                <h3 className="truncate font-display text-lg font-medium text-fg">
                  {n.titulo}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{n.resumen}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={() => abrirProgramar(n)}>
                    <CalendarPlus className="size-4" />
                    Programar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => descartar(n)}>
                    <X className="size-4" />
                    Descartar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => reextraer(n)} title="Volver a bajar el contenido (recupera listas/calendarios)">
                    <RotateCw className="size-4" />
                    Re-extraer
                  </Button>
                  <a
                    href={n.urlOriginal}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-fg"
                  >
                    <ExternalLink className="size-3.5" />
                    Original
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel Programar — fullscreen */}
      <AnimatePresence>
        {activa && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex flex-col bg-surface"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-line px-6 py-3.5">
              <CalendarPlus className="size-5 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-medium text-fg">Programar nota</p>
                <p className="truncate text-xs text-muted">{activa.fuente}</p>
              </div>
              <a
                href={activa.urlOriginal}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-elevated hover:text-fg"
              >
                <ExternalLink className="size-4" />
                Ver nota original
              </a>
              <button
                type="button"
                onClick={() => !pending && setActiva(null)}
                aria-label="Cerrar"
                className="grid size-9 place-items-center rounded-lg text-muted hover:bg-elevated hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            {preparando ? (
              <div className="grid flex-1 place-items-center">
                <PreparandoIA />
              </div>
            ) : prep ? (
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                {/* Contenido */}
                <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
                  <div className="mx-auto max-w-5xl space-y-4">
                    {/* Imagen / portada (arriba, para que no se pierda) */}
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg">
                        <ImageIcon className="size-4 text-accent" />
                        Imagen de portada
                      </p>
                      {imagenUrl ? (
                        <div className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagenUrl}
                            alt=""
                            className="max-h-52 w-full rounded-[var(--radius)] object-cover"
                          />
                          <Button variant="ghost" size="sm" className="text-danger" onClick={() => setImagenUrl(null)}>
                            <Trash2 className="size-4" />
                            Quitar imagen
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted">Sin imagen. Elegí una de la galería o pegá una URL.</p>
                      )}

                      {prep.imagenes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {prep.imagenes.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setImagenUrl(url)}
                              className={
                                "relative size-16 overflow-hidden rounded-lg border-2 transition-colors " +
                                (imagenUrl === url ? "border-accent" : "border-line hover:border-fg/30")
                              }
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="size-full object-cover" />
                              {imagenUrl === url && (
                                <span className="absolute inset-0 grid place-items-center bg-accent/30">
                                  <Check className="size-5 text-brand-foreground" />
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <input
                          value={imgInput}
                          onChange={(e) => setImgInput(e.target.value)}
                          placeholder="https://…/imagen.jpg"
                          className={inputCls}
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (imgInput.trim()) {
                              setImagenUrl(imgInput.trim());
                              setImgInput("");
                            }
                          }}
                        >
                          Usar
                        </Button>
                      </div>
                    </div>

                    {/* Título: reescrito (editable) + original para comparar */}
                    <div className="space-y-1.5 border-t border-line pt-4">
                      <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-display text-2xl font-medium text-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                      <p className="px-1 text-xs leading-snug text-muted">
                        <span className="font-medium text-fg/70">Título original:</span> {activa.titulo}
                      </p>
                    </div>

                    {/* Barra: similitud + toggle de vista */}
                    <div className="flex flex-wrap items-center gap-3">
                      {prep.similarity != null && (
                        <Badge tone={prep.similarity > 0.4 ? "warning" : "success"}>
                          {Math.round(prep.similarity * 100)}% parecido al original
                        </Badge>
                      )}
                      <span className="font-mono text-xs text-muted">{palabras} palabras</span>
                      <div className="ml-auto flex rounded-lg border border-line p-0.5">
                        {([
                          ["diff", "Diff", Columns2],
                          ["editar", "Editar", Pencil],
                          ["limpio", "Vista", Eye],
                        ] as const).map(([v, label, Icon]) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVista(v)}
                            className={
                              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                              (vista === v ? "bg-elevated text-fg" : "text-muted hover:text-fg")
                            }
                          >
                            <Icon className="size-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cuerpo según la vista */}
                    {regenerando ? (
                      <div className="grid min-h-[20rem] place-items-center rounded-[var(--radius)] bg-elevated/40">
                        <PreparandoIA />
                      </div>
                    ) : vista === "diff" ? (
                      <DiffView original={prep.original} revised={contenido} />
                    ) : vista === "editar" ? (
                      <textarea
                        value={contenido}
                        onChange={(e) => setContenido(e.target.value)}
                        className="min-h-[20rem] w-full rounded-[var(--radius)] border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed text-fg focus:outline-none focus:ring-2 focus:ring-brand/40"
                      />
                    ) : (
                      <article className="rounded-[var(--radius)] bg-elevated/40 p-5">
                        <Markdown>{contenido}</Markdown>
                      </article>
                    )}
                  </div>
                </div>

                {/* Sidebar de programación */}
                <aside className="flex w-full shrink-0 flex-col border-t border-line lg:w-80 lg:border-l lg:border-t-0">
                  <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    {/* Configuración de reescritura */}
                    <div className="rounded-lg border border-line bg-elevated/40 p-3">
                      <p className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-fg">
                        <Settings2 className="size-4 text-accent" />
                        Reescritura
                      </p>
                      <div className="space-y-2.5">
                        <Field label="Tono">
                          <select value={tono} onChange={(e) => setTono(e.target.value)} className={inputCls}>
                            {TONOS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Proveedor de IA">
                          <select
                            value={proveedor}
                            onChange={(e) => setProveedor(e.target.value as Proveedor)}
                            className={inputCls}
                          >
                            <option value="auto">Automático</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="claude">Claude</option>
                          </select>
                        </Field>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={regenerar}
                          disabled={regenerando}
                        >
                          <RotateCw className={"size-4" + (regenerando ? " animate-spin" : "")} />
                          {regenerando ? "Regenerando…" : "Regenerar noticia"}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-fg">Sitios de destino</p>
                      {destinos.length === 0 ? (
                        <p className="text-sm text-muted">
                          No hay sitios cargados.{" "}
                          <Link href="/destinos" className="text-accent hover:underline">
                            Agregá un destino
                          </Link>
                          .
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {destinos.map((d) => {
                            const on = sitios.has(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => toggleSitio(d.id)}
                                className={
                                  "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left text-sm transition-colors " +
                                  (on ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:bg-elevated")
                                }
                              >
                                <span
                                  className={
                                    "grid size-5 shrink-0 place-items-center rounded border " +
                                    (on ? "border-accent bg-accent text-brand-foreground" : "border-line")
                                  }
                                >
                                  {on && <Check className="size-3.5" />}
                                </span>
                                {d.nombre}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Día">
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Hora">
                        <input type="time" value={horaStr} onChange={(e) => setHoraStr(e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-line p-4">
                    <Button className="w-full" onClick={programar} disabled={pending}>
                      <CalendarPlus className="size-4" />
                      {pending ? "Programando…" : "Programar en el calendario"}
                    </Button>
                  </div>
                </aside>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <TraerDialog
        fuentes={fuentes}
        destinos={destinos}
        categorias={categorias}
        open={traerOpen}
        onClose={() => setTraerOpen(false)}
        onDone={() => router.refresh()}
      />

      <Toast message={message} />
    </div>
  );
}

const MENSAJES = [
  "Leyendo la nota original…",
  "Reescribiendo con la IA…",
  "Evitando frases idénticas…",
  "Clasificando y etiquetando…",
];

function PreparandoIA() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % MENSAJES.length), 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="relative grid size-20 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-accent/15"
          animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute inset-2 rounded-full bg-accent/25"
          animate={{ scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <motion.div
          animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="size-9 text-accent" />
        </motion.div>
      </div>
      <div className="h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium text-fg"
          >
            {MENSAJES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((d) => (
          <motion.span
            key={d}
            className="size-2 rounded-full bg-accent"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
