"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  Lock,
  Minus,
  Pencil,
  Plus,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import {
  desprogramar,
  despacharProgramadas,
  listarCalendario,
  listarSinProgramar,
  publicarAhora,
  quitarDelCalendario,
  reprogramar,
  type CalendarioEvento,
  type SinProgramarRow,
} from "@/server/calendario";

const PALETA = [
  "#3b82f6", "#22c55e", "#a855f7", "#f59e0b",
  "#06b6d4", "#ef4444", "#eab308", "#6366f1",
  "#ec4899", "#14b8a6",
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const GUTTER = 56;
const BLOCK_H = 52;
const SNAP = 5;
const ZOOMS = [40, 56, 76, 104, 140];

type Modo = "dia" | "semana" | "mes";
type Destino = { id: string; nombre: string };

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date) {
  const wd = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - wd);
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function dayOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function minOf(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function fmtMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function isoAt(dia: Date, min: number) {
  return new Date(
    dia.getFullYear(),
    dia.getMonth(),
    dia.getDate(),
    Math.floor(min / 60),
    min % 60,
  ).toISOString();
}
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Layout = { lane: number; lanes: number; min: number };

function calcularLayout(items: CalendarioEvento[], hourH: number): Map<string, Layout> {
  const dur = (BLOCK_H / hourH) * 60;
  const sorted = [...items].sort((a, b) => minOf(a.fecha) - minOf(b.fecha));
  const out = new Map<string, Layout>();
  let cluster: CalendarioEvento[] = [];
  let curEnd = -1;
  const cerrar = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    for (const it of cluster) {
      const m = minOf(it.fecha);
      let lane = laneEnds.findIndex((e) => e <= m);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = m + dur;
      out.set(it.id, { lane, lanes: 0, min: m });
    }
    for (const it of cluster) out.get(it.id)!.lanes = laneEnds.length;
    cluster = [];
    curEnd = -1;
  };
  for (const it of sorted) {
    const m = minOf(it.fecha);
    if (cluster.length && m < curEnd) {
      cluster.push(it);
      curEnd = Math.max(curEnd, m + dur);
    } else {
      cerrar();
      cluster = [it];
      curEnd = m + dur;
    }
  }
  cerrar();
  return out;
}

export function CalendarioBoard({ destinos }: { destinos: Destino[] }) {
  const { message, show } = useToast();
  const scroller = useRef<HTMLDivElement>(null);

  const [modo, setModo] = useState<Modo>("dia");
  const [hourH, setHourH] = useState(56);
  const [fecha, setFecha] = useState(() => dayOnly(new Date()));
  const [eventos, setEventos] = useState<CalendarioEvento[]>([]);
  const [backlog, setBacklog] = useState<SinProgramarRow[]>([]);
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  const [evtSel, setEvtSel] = useState<CalendarioEvento | null>(null);
  const [despachando, setDespachando] = useState(false);
  const [drag, setDrag] = useState<{ id: string; min: number; moved: boolean } | null>(null);
  const dragRef = useRef<{ startY: number; origMin: number } | null>(null);

  // Modal "Programar / Nueva publicación"
  const [progOpen, setProgOpen] = useState(false);
  const [progFecha, setProgFecha] = useState(() => ymd(new Date()));
  const [progHora, setProgHora] = useState("09:00");
  const [progSel, setProgSel] = useState<string>("");

  const hoy = dayOnly(new Date());
  const colorDe = useCallback(
    (id: string) => {
      const i = destinos.findIndex((d) => d.id === id);
      return PALETA[(i < 0 ? 0 : i) % PALETA.length]!;
    },
    [destinos],
  );

  const dias =
    modo === "semana"
      ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(fecha), i))
      : [fecha];

  // Rango a cargar según el modo.
  const rango = useCallback(() => {
    if (modo === "mes") {
      const ini = startOfWeek(startOfMonth(fecha));
      return { desde: ini, hasta: addDays(ini, 42) };
    }
    if (modo === "semana") {
      const ini = startOfWeek(fecha);
      return { desde: ini, hasta: addDays(ini, 7) };
    }
    return { desde: fecha, hasta: addDays(fecha, 1) };
  }, [modo, fecha]);

  const recargar = useCallback(async () => {
    const { desde, hasta } = rango();
    const [evs, bl] = await Promise.all([
      listarCalendario(desde.toISOString(), hasta.toISOString()),
      listarSinProgramar(),
    ]);
    setEventos(evs);
    setBacklog(bl);
  }, [rango]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Auto-refresco de los eventos cada 30s: al dispararse una programada, aparece
  // publicada (con candado) sin recargar toda la página. Solo re-pide los datos
  // del calendario; se saltea mientras arrastrás un bloque.
  useEffect(() => {
    const t = setInterval(() => {
      if (!dragRef.current) recargar();
    }, 30000);
    return () => clearInterval(t);
  }, [recargar]);

  useEffect(() => {
    // El valor inicial de nowMin se calcula en SSR (servidor en UTC), así que la
    // línea "ahora" arranca desfasada (ej. 22h UTC cuando en AR son las 19h).
    // Se corrige apenas monta en el cliente (horario local del navegador), no
    // recién a los 30s.
    const tick = () => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * hourH;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  const visibles = eventos.filter((e) => !ocultos.has(e.destinoId));
  const eventosDe = (dia: Date) =>
    visibles.filter((e) => sameDay(new Date(e.fecha), dia));

  function toggleDestino(id: string) {
    setOcultos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function navegar(delta: number) {
    if (modo === "mes") {
      setFecha((f) => new Date(f.getFullYear(), f.getMonth() + delta, 1));
    } else {
      const paso = modo === "semana" ? delta * 7 : delta;
      setFecha((f) => addDays(f, paso));
    }
  }
  function zoom(dir: number) {
    setHourH((h) => {
      const i = ZOOMS.indexOf(h);
      return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))]!;
    });
  }

  // ---- Acciones ----
  async function programar() {
    if (!progSel) return show("Elegí una nota de la cola");
    const [hh, mm] = progHora.split(":").map(Number);
    const [y, m, d] = progFecha.split("-").map(Number);
    const iso = isoAt(new Date(y!, (m ?? 1) - 1, d ?? 1), (hh ?? 9) * 60 + (mm ?? 0));
    await reprogramar(progSel, iso);
    setProgOpen(false);
    setProgSel("");
    show("Programada");
    await recargar();
  }
  function abrirProgramar(dia?: Date, min?: number) {
    setProgFecha(ymd(dia ?? fecha));
    if (min != null) setProgHora(fmtMin(min));
    setProgSel(backlog[0]?.id ?? "");
    setProgOpen(true);
  }
  async function guardarFecha(evt: CalendarioEvento, dia: Date, min: number) {
    await reprogramar(evt.id, isoAt(dia, min));
    show("Reprogramada");
    setEvtSel(null);
    await recargar();
  }
  async function publicarYaEvt(evt: CalendarioEvento) {
    const r = await publicarAhora(evt.id);
    show(r.ok ? "Publicada" : r.error ?? "No se pudo publicar");
    setEvtSel(null);
    await recargar();
  }
  async function quitarEvt(evt: CalendarioEvento) {
    await quitarDelCalendario(evt.id);
    show("Quitada del calendario");
    setEvtSel(null);
    await recargar();
  }
  async function sacarFecha(evt: CalendarioEvento) {
    await desprogramar(evt.id);
    show("Sin fecha (se despacha por cadencia)");
    setEvtSel(null);
    await recargar();
  }

  async function despacharYa() {
    setDespachando(true);
    try {
      const r = await despacharProgramadas();
      show(
        r.despachadas > 0
          ? `Se publicaron ${r.despachadas}${r.errores ? ` · ${r.errores} con error` : ""}`
          : "No había programadas vencidas",
      );
      await recargar();
    } catch {
      show("No se pudo despachar.");
    } finally {
      setDespachando(false);
    }
  }

  // ---- Drag en timeline ----
  function onDown(e: ReactPointerEvent, it: CalendarioEvento) {
    if (it.estado === "publicada") return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, origMin: minOf(it.fecha) };
    setDrag({ id: it.id, min: minOf(it.fecha), moved: false });
  }
  function onMove(e: ReactPointerEvent, id: string) {
    const d = dragRef.current;
    if (!d) return;
    let min = d.origMin + ((e.clientY - d.startY) / hourH) * 60;
    min = Math.min(1435, Math.max(0, Math.round(min / SNAP) * SNAP));
    setDrag({ id, min, moved: Math.abs(e.clientY - d.startY) > 4 });
  }
  async function onUp(e: ReactPointerEvent, it: CalendarioEvento, dia: Date) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const cur = drag;
    setDrag(null);
    if (!cur || !cur.moved) {
      setEvtSel(it);
      return;
    }
    const iso = isoAt(dia, cur.min);
    setEventos((prev) => prev.map((p) => (p.id === it.id ? { ...p, fecha: iso } : p)));
    await reprogramar(it.id, iso);
    show("Reprogramada");
    recargar();
  }

  const fechaTxt =
    modo === "semana"
      ? `${dias[0]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${dias[6]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`
      : modo === "mes"
        ? fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        : fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Stats del rail
  const delDia = eventosDe(fecha);
  const sitiosActivos = new Set(visibles.map((e) => e.destinoId)).size;
  const programadas = visibles.filter((e) => e.estado !== "publicada").length;

  return (
    <div className="w-full">
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Calendario editorial
          </h2>
          <p className="mt-1 text-sm text-muted">
            Programá y organizá tus publicaciones por horario y destino.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RelojPuntos />
          <Button variant="outline" onClick={despacharYa} disabled={despachando}>
            <Send className={"size-4" + (despachando ? " animate-pulse" : "")} />
            {despachando ? "Despachando…" : "Despachar ahora"}
          </Button>
          <Button onClick={() => abrirProgramar()}>
            <Plus className="size-4" />
            Nueva publicación
          </Button>
        </div>
      </div>

      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFecha(hoy)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-elevated"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => navegar(-1)}
            className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => navegar(1)}
            className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <p className="flex items-center gap-2 text-sm font-medium capitalize text-fg">
          <CalendarDays className="size-4 text-accent" />
          {fechaTxt}
        </p>

        <div className="ml-auto flex items-center gap-2">
          {modo !== "mes" && (
            <div className="flex items-center gap-1 rounded-lg border border-line p-0.5">
              <button
                type="button"
                onClick={() => zoom(-1)}
                disabled={hourH === ZOOMS[0]}
                className="grid size-7 place-items-center rounded-md text-muted hover:bg-elevated disabled:opacity-40"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="px-1 font-mono text-[11px] text-muted">zoom</span>
              <button
                type="button"
                onClick={() => zoom(1)}
                disabled={hourH === ZOOMS[ZOOMS.length - 1]}
                className="grid size-7 place-items-center rounded-md text-muted hover:bg-elevated disabled:opacity-40"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-line p-0.5">
            {(["dia", "semana", "mes"] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                  (modo === m ? "bg-elevated text-fg" : "text-muted hover:text-fg")
                }
              >
                {m === "dia" ? "Día" : m === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Columna principal */}
        <div className="min-w-0 flex-1">
          {/* Leyenda de sitios (filtro) */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line/70 bg-surface px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <SlidersHorizontal className="size-3.5" />
              Sitios
            </span>
            {destinos.map((d) => {
              const off = ocultos.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDestino(d.id)}
                  className={
                    "flex items-center gap-1.5 text-xs transition-opacity " +
                    (off ? "opacity-35" : "opacity-100")
                  }
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: colorDe(d.id) }} />
                  <span className="text-fg/80">{d.nombre}</span>
                </button>
              );
            })}
            <Link
              href="/destinos"
              className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-fg"
            >
              <Pencil className="size-3" />
              Editar sitios
            </Link>
          </div>

          {modo === "mes" ? (
            <VistaMes
              fecha={fecha}
              eventosDe={eventosDe}
              colorDe={colorDe}
              hoy={hoy}
              onDia={(d) => {
                setFecha(d);
                setModo("dia");
              }}
              onEvento={setEvtSel}
            />
          ) : (
            <>
              {modo === "semana" && (
                <div className="flex border-b border-line/70 pb-2 text-center">
                  <div style={{ width: GUTTER }} className="shrink-0" />
                  {dias.map((d) => {
                    const esHoy = sameDay(d, hoy);
                    return (
                      <div key={d.toISOString()} className="flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted">
                          {d.toLocaleDateString("es-AR", { weekday: "short" })}
                        </p>
                        <p
                          className={
                            "mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-sm font-medium " +
                            (esHoy ? "bg-accent text-brand-foreground" : "text-fg")
                          }
                        >
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                ref={scroller}
                className="mt-2 max-h-[62vh] overflow-y-auto rounded-[var(--radius-lg)] border border-line/70 bg-surface shadow-soft"
              >
                <div className="flex" style={{ height: hourH * 24 }}>
                  <div className="relative shrink-0" style={{ width: GUTTER }}>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <span
                        key={h}
                        className="absolute right-2 font-mono text-[11px] text-muted"
                        style={{ top: h * hourH - 6 }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>

                  {dias.map((dia) => {
                    const evs = eventosDe(dia);
                    const lay = calcularLayout(evs, hourH);
                    const esHoy = sameDay(dia, hoy);
                    const compact = modo === "semana";
                    return (
                      <div
                        key={dia.toISOString()}
                        className="relative flex-1 border-l border-line/60"
                        onPointerDown={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          const min = Math.round((((e.clientY - r.top) / hourH) * 60) / SNAP) * SNAP;
                          abrirProgramar(dia, Math.min(1435, Math.max(0, min)));
                        }}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div
                            key={h}
                            className="absolute inset-x-0 border-t border-line/50"
                            style={{ top: h * hourH }}
                          />
                        ))}

                        {esHoy && (
                          <div
                            className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                            style={{ top: (nowMin / 60) * hourH }}
                          >
                            <span className="size-2 rounded-full bg-danger" />
                            <span className="h-px flex-1 bg-danger/70" />
                          </div>
                        )}

                        {evs.map((it) => {
                          const l = lay.get(it.id);
                          if (!l) return null;
                          const pub = it.estado === "publicada";
                          const min = drag?.id === it.id ? drag.min : l.min;
                          const color = colorDe(it.destinoId);
                          // Publicada = disparada: bloqueada, sin drag, look deshabilitado.
                          const handlers = pub
                            ? { onClick: () => setEvtSel(it) }
                            : {
                                onPointerDown: (e: ReactPointerEvent) => onDown(e, it),
                                onPointerMove: (e: ReactPointerEvent) => onMove(e, it.id),
                                onPointerUp: (e: ReactPointerEvent) => onUp(e, it, dia),
                              };
                          return (
                            <div
                              key={it.id}
                              {...handlers}
                              className={
                                "absolute z-[5] touch-none select-none overflow-hidden rounded-lg border px-2.5 py-1.5 " +
                                (pub
                                  ? "cursor-default border-line bg-elevated opacity-60"
                                  : "cursor-grab shadow-soft active:cursor-grabbing")
                              }
                              style={{
                                top: (min / 60) * hourH,
                                height: BLOCK_H,
                                left: `calc(100% * ${l.lane} / ${l.lanes} + 3px)`,
                                width: `calc(100% / ${l.lanes} - 6px)`,
                                ...(pub
                                  ? { borderLeft: `3px solid ${color}88` }
                                  : {
                                      borderColor: color + "66",
                                      backgroundColor: color + "1e",
                                      borderLeft: `3px solid ${color}`,
                                    }),
                              }}
                            >
                              <p className="flex items-center gap-1 font-mono text-[10px] text-muted">
                                {pub && <Lock className="size-2.5" />}
                                {fmtMin(min)}
                              </p>
                              <p
                                className={
                                  "truncate text-[12px] font-medium leading-tight " +
                                  (pub ? "text-muted" : "text-fg")
                                }
                              >
                                {it.titulo || "(sin título)"}
                              </p>
                              {!compact && (
                                <p className="flex items-center gap-1 truncate text-[10px] text-muted">
                                  <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                                  {it.destinoNombre ?? "—"}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted">
                Tocá un hueco para programar · arrastrá un bloque para mover la hora · clic para ver detalle
              </p>
            </>
          )}
        </div>

        {/* Rail derecho */}
        <aside className="hidden w-72 shrink-0 space-y-4 xl:block">
          <MiniCal
            fecha={fecha}
            hoy={hoy}
            eventos={visibles}
            onPick={(d) => {
              setFecha(d);
              if (modo === "mes") setModo("dia");
            }}
          />

          <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface p-4 shadow-soft">
            <p className="mb-3 font-display text-sm font-medium text-fg">Detalles del día</p>
            <div className="space-y-2.5 text-sm">
              <Stat label="Publicaciones" valor={delDia.length} />
              <Stat label="Sitios activos" valor={sitiosActivos} />
              <Stat label="Notas programadas" valor={programadas} />
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface p-4 shadow-soft">
            <p className="mb-2 font-display text-sm font-medium text-fg">Acciones rápidas</p>
            <div className="space-y-0.5">
              <AccionRapida icon={Plus} onClick={() => abrirProgramar()}>
                Programar nota
              </AccionRapida>
              <AccionLink icon={Inbox} href="/curaduria">
                Ver bandeja de entrada
              </AccionLink>
              <AccionLink icon={Send} href="/bandeja">
                Ver bandeja de salida
              </AccionLink>
              <AccionLink icon={ExternalLink} href="/biblioteca">
                Ver historial de publicaciones
              </AccionLink>
            </div>
          </div>
        </aside>
      </div>

      {/* Panel de evento */}
      <AnimatePresence>
        {evtSel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setEvtSel(null)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-xl"
            >
              <PanelEvento
                evt={evtSel}
                color={colorDe(evtSel.destinoId)}
                onClose={() => setEvtSel(null)}
                onGuardar={guardarFecha}
                onPublicar={publicarYaEvt}
                onQuitar={quitarEvt}
                onSacarFecha={sacarFecha}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modal programar */}
      <Modal open={progOpen} onClose={() => setProgOpen(false)} title="Programar publicación">
        {backlog.length === 0 ? (
          <div className="space-y-3 text-sm text-muted">
            <p>No hay notas en la cola para programar.</p>
            <p>
              Enviá notas a la{" "}
              <Link href="/bandeja" className="text-accent hover:underline">
                bandeja de salida
              </Link>{" "}
              y aparecerán acá para asignarles día y hora.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs text-muted">Nota de la cola</p>
              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {backlog.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setProgSel(b.id)}
                    className={
                      "flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors " +
                      (progSel === b.id ? "border-accent bg-accent/10" : "border-line hover:bg-elevated")
                    }
                    style={{ borderLeft: `3px solid ${colorDe(b.destinoId)}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{b.titulo || "(sin título)"}</p>
                      <p className="truncate text-xs text-muted">{b.destinoNombre ?? "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Día">
                <input type="date" value={progFecha} onChange={(e) => setProgFecha(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Hora">
                <input type="time" value={progHora} onChange={(e) => setProgHora(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProgOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={programar}>Programar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={message} />
    </div>
  );
}

// Fuente 3x5 de puntos para el reloj (dígitos + dos puntos).
const FONT_PUNTOS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  ":": ["0", "0", "1", "0", "1"],
};

/** Reloj HH:MM con tipografía de puntos (dot-matrix), para ver la hora rápido. */
function RelojPuntos() {
  const [hhmm, setHhmm] = useState("--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setHhmm(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="flex items-center gap-[3px] rounded-lg border border-line bg-elevated/50 px-2.5 py-1.5"
      title="Hora actual"
    >
      {hhmm.split("").map((ch, i) => {
        const pat = FONT_PUNTOS[ch] ?? FONT_PUNTOS["0"]!;
        return (
          <div key={i} className="flex flex-col gap-[2px]">
            {pat.map((row, r) => (
              <div key={r} className="flex gap-[2px]">
                {row.split("").map((bit, c) => (
                  <span
                    key={c}
                    className={
                      "size-[3px] rounded-full " +
                      (bit === "1" ? "bg-accent" : "bg-fg/10")
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-display text-lg font-medium text-fg">{valor}</span>
    </div>
  );
}

function AccionRapida({
  icon: Icon,
  children,
  onClick,
}: {
  icon: typeof Plus;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted transition-colors hover:bg-elevated hover:text-fg"
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}
function AccionLink({
  icon: Icon,
  href,
  children,
}: {
  icon: typeof Plus;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-fg"
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </Link>
  );
}

function MiniCal({
  fecha,
  hoy,
  eventos,
  onPick,
}: {
  fecha: Date;
  hoy: Date;
  eventos: CalendarioEvento[];
  onPick: (d: Date) => void;
}) {
  const [vista, setVista] = useState(() => startOfMonth(fecha));
  useEffect(() => {
    setVista(startOfMonth(fecha));
  }, [fecha]);
  const primera = startOfWeek(vista);
  const celdas = Array.from({ length: 42 }, (_, i) => addDays(primera, i));
  const conEvento = new Set(eventos.map((e) => ymd(new Date(e.fecha))));

  return (
    <div className="rounded-[var(--radius-lg)] border border-line/70 bg-surface p-3 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVista((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-elevated"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium capitalize text-fg">
          {vista.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setVista((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-elevated"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="py-1 text-[10px] font-medium text-muted">
            {d}
          </span>
        ))}
        {celdas.map((d) => {
          const otro = d.getMonth() !== vista.getMonth();
          const sel = sameDay(d, fecha);
          const esHoy = sameDay(d, hoy);
          const tiene = conEvento.has(ymd(d));
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPick(d)}
              className={
                "relative mx-auto grid size-8 place-items-center rounded-full text-xs transition-colors " +
                (sel
                  ? "bg-accent font-medium text-brand-foreground"
                  : esHoy
                    ? "font-medium text-accent hover:bg-elevated"
                    : otro
                      ? "text-muted/40 hover:bg-elevated"
                      : "text-fg hover:bg-elevated")
              }
            >
              {d.getDate()}
              {tiene && !sel && (
                <span className="absolute bottom-1 size-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VistaMes({
  fecha,
  eventosDe,
  colorDe,
  hoy,
  onDia,
  onEvento,
}: {
  fecha: Date;
  eventosDe: (d: Date) => CalendarioEvento[];
  colorDe: (id: string) => string;
  hoy: Date;
  onDia: (d: Date) => void;
  onEvento: (e: CalendarioEvento) => void;
}) {
  const primera = startOfWeek(startOfMonth(fecha));
  const celdas = Array.from({ length: 42 }, (_, i) => addDays(primera, i));
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line/70 bg-surface shadow-soft">
      <div className="grid grid-cols-7 border-b border-line/60 text-center">
        {DIAS.map((d) => (
          <div key={d} className="py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((dia) => {
          const evs = eventosDe(dia);
          const esHoy = sameDay(dia, hoy);
          const otro = dia.getMonth() !== fecha.getMonth();
          return (
            <div
              key={dia.toISOString()}
              onClick={() => onDia(dia)}
              className={
                "flex min-h-[96px] cursor-pointer flex-col gap-1 border-b border-r border-line/50 p-1.5 transition-colors hover:bg-elevated/50 " +
                (otro ? "bg-elevated/20" : "")
              }
            >
              <span
                className={
                  "grid size-6 place-items-center rounded-full text-xs font-medium " +
                  (esHoy ? "bg-accent text-brand-foreground" : otro ? "text-muted/50" : "text-fg")
                }
              >
                {dia.getDate()}
              </span>
              <div className="flex flex-col gap-1 overflow-hidden">
                {evs.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEvento(e);
                    }}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight"
                    style={{ backgroundColor: colorDe(e.destinoId) + "22" }}
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: colorDe(e.destinoId) }} />
                    <span className="truncate text-fg/80">
                      {e.estado === "publicada" ? "" : hora(e.fecha) + " "}
                      {e.titulo || "(sin título)"}
                    </span>
                  </button>
                ))}
                {evs.length > 3 && <span className="px-1 text-[10px] text-muted">+{evs.length - 3} más</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function estadoBadge(estado: CalendarioEvento["estado"]) {
  if (estado === "publicada") return <Badge tone="success">Publicada</Badge>;
  if (estado === "error") return <Badge tone="danger">Error</Badge>;
  return <Badge tone="neutral">En cola</Badge>;
}

function PanelEvento({
  evt,
  color,
  onClose,
  onGuardar,
  onPublicar,
  onQuitar,
  onSacarFecha,
}: {
  evt: CalendarioEvento;
  color: string;
  onClose: () => void;
  onGuardar: (e: CalendarioEvento, dia: Date, min: number) => void;
  onPublicar: (e: CalendarioEvento) => void;
  onQuitar: (e: CalendarioEvento) => void;
  onSacarFecha: (e: CalendarioEvento) => void;
}) {
  const f = new Date(evt.fecha);
  const [fechaStr, setFechaStr] = useState(ymd(f));
  const [hhmm, setHhmm] = useState(
    `${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`,
  );
  const editable = evt.estado !== "publicada";

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-4 py-4">
        <button type="button" onClick={onClose} aria-label="Volver" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-elevated">
          <ArrowLeft className="size-4" />
        </button>
        <p className="flex-1 truncate font-display text-base font-medium text-fg">Publicación</p>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-elevated">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <p className="text-base font-medium text-fg">{evt.titulo || "(sin título)"}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
            {evt.destinoNombre ?? "—"}
            {evt.categoria && <span>· {evt.categoria}</span>}
          </p>
        </div>

        <div>{estadoBadge(evt.estado)}</div>

        {editable ? (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <Clock className="size-4 text-accent" />
              Programación
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={fechaStr} onChange={(e) => setFechaStr(e.target.value)} className={inputCls} />
              <input type="time" value={hhmm} onChange={(e) => setHhmm(e.target.value)} className={inputCls} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const [y, m, d] = fechaStr.split("-").map(Number);
                const [hh, mm] = hhmm.split(":").map(Number);
                onGuardar(evt, new Date(y!, (m ?? 1) - 1, d ?? 1), (hh ?? 9) * 60 + (mm ?? 0));
              }}
            >
              Guardar fecha y hora
            </Button>
          </div>
        ) : (
          evt.urlPublicada && (
            <a
              href={evt.urlPublicada}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-accent hover:underline"
            >
              <ExternalLink className="size-4" />
              Ver publicación
            </a>
          )
        )}
      </div>

      {editable && (
        <div className="space-y-2 border-t border-line px-5 py-4">
          <Button className="w-full" onClick={() => onPublicar(evt)}>
            <Send className="size-4" />
            Publicar ahora
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onSacarFecha(evt)}>
              Sin fecha
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => onQuitar(evt)}>
              <Trash2 className="size-4" />
              Quitar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
