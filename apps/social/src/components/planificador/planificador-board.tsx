"use client";

import { Badge } from "@scrapify/ui/badge";
import { Button } from "@scrapify/ui/button";
import { Field, Modal, inputCls } from "@scrapify/ui/modal";
import { Toast, useToast } from "@scrapify/ui/toast";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { ClienteConCuentas, Plataforma } from "@/server/cuentas";
import {
  actualizarProgramada,
  crearProgramada,
  eliminarProgramada,
  listarProgramadas,
  moverProgramada,
  type ProgramadaRow,
} from "@/server/planificador";

const GUTTER = 52;
const BLOCK_H = 44;
const SNAP = 5;
const ZOOMS = [36, 56, 84, 120, 160];

const COLOR_PLAT: Record<Plataforma, string> = {
  instagram: "#d6336c",
  facebook: "#3b5998",
  tiktok: "#0ea5b7",
};

type Modo = "dia" | "semana";

function minOf(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function fmtMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function dayOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isoAt(fecha: Date, min: number) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    Math.floor(min / 60),
    min % 60,
  ).toISOString();
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfWeek(d: Date) {
  const wd = (d.getDay() + 6) % 7; // lunes = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - wd);
}

type Layout = { lane: number; lanes: number; min: number };

function calcularLayout(items: ProgramadaRow[], hourH: number): Map<string, Layout> {
  const dur = (BLOCK_H / hourH) * 60;
  const sorted = [...items].sort(
    (a, b) => minOf(a.programadaEn) - minOf(b.programadaEn),
  );
  const out = new Map<string, Layout>();
  let cluster: ProgramadaRow[] = [];
  let curEnd = -1;
  const cerrar = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    for (const it of cluster) {
      const m = minOf(it.programadaEn);
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
    const m = minOf(it.programadaEn);
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

export function PlanificadorBoard({ clientes }: { clientes: ClienteConCuentas[] }) {
  const { message, show } = useToast();
  const scroller = useRef<HTMLDivElement>(null);

  const [modo, setModo] = useState<Modo>("dia");
  const [hourH, setHourH] = useState(56);
  const [fecha, setFecha] = useState(() => dayOnly(new Date()));
  const [items, setItems] = useState<ProgramadaRow[]>([]);
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  const [drag, setDrag] = useState<{ id: string; min: number; moved: boolean } | null>(null);
  const dragRef = useRef<{ startY: number; origMin: number } | null>(null);

  // Modal
  const [editId, setEditId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fFecha, setFFecha] = useState<Date>(() => dayOnly(new Date()));
  const [fClienteId, setFClienteId] = useState("");
  const [fCuentaId, setFCuentaId] = useState("");
  const [fHora, setFHora] = useState("12:00");
  const [fTitulo, setFTitulo] = useState("");
  const [fCaption, setFCaption] = useState("");

  const hoy = dayOnly(new Date());
  const dias = modo === "dia" ? [fecha] : Array.from({ length: 7 }, (_, i) => {
    const s = startOfWeek(fecha);
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
  });

  async function recargar() {
    const desde = dias[0]!;
    const ultimo = dias[dias.length - 1]!;
    const hasta = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1);
    const rows = await listarProgramadas(desde.toISOString(), hasta.toISOString());
    setItems(rows);
  }

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, fecha]);

  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * hourH;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navegar(delta: number) {
    const paso = modo === "dia" ? delta : delta * 7;
    setFecha((f) => new Date(f.getFullYear(), f.getMonth(), f.getDate() + paso));
  }

  function zoom(dir: number) {
    setHourH((h) => {
      const i = ZOOMS.indexOf(h);
      const ni = Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir));
      return ZOOMS[ni]!;
    });
  }

  const clienteSel = clientes.find((c) => c.id === fClienteId);

  function abrirCrear(dia: Date, min: number) {
    const c0 = clientes[0];
    setEditId(null);
    setFFecha(dia);
    setFClienteId(c0?.id ?? "");
    setFCuentaId(c0?.cuentas[0]?.id ?? "");
    setFHora(fmtMin(min));
    setFTitulo("");
    setFCaption("");
    setModalOpen(true);
  }
  function abrirEditar(it: ProgramadaRow) {
    setEditId(it.id);
    setFFecha(dayOnly(new Date(it.programadaEn)));
    setFClienteId(it.clienteId);
    setFCuentaId(it.socialAccountId ?? "");
    setFHora(fmtMin(minOf(it.programadaEn)));
    setFTitulo(it.videoTitulo ?? "");
    setFCaption(it.caption ?? "");
    setModalOpen(true);
  }

  async function guardar() {
    const cuenta = clienteSel?.cuentas.find((a) => a.id === fCuentaId);
    if (!clienteSel) return show("Elegí un cliente");
    if (!cuenta) return show("Elegí una cuenta");
    const [hh, mm] = fHora.split(":").map(Number);
    const iso = isoAt(fFecha, (hh ?? 0) * 60 + (mm ?? 0));
    if (editId) {
      await actualizarProgramada(editId, {
        videoTitulo: fTitulo,
        caption: fCaption,
        plataforma: cuenta.plataforma,
        socialAccountId: cuenta.id,
        programadaEnISO: iso,
      });
      show("Actualizada");
    } else {
      await crearProgramada({
        clienteId: clienteSel.id,
        socialAccountId: cuenta.id,
        plataforma: cuenta.plataforma,
        videoTitulo: fTitulo,
        caption: fCaption,
        programadaEnISO: iso,
      });
      show("Programada");
    }
    setModalOpen(false);
    recargar();
  }
  async function borrar() {
    if (!editId) return;
    await eliminarProgramada(editId);
    setModalOpen(false);
    setItems((prev) => prev.filter((p) => p.id !== editId));
    show("Eliminada");
  }

  // ---- Drag ----
  function onDown(e: ReactPointerEvent, it: ProgramadaRow) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, origMin: minOf(it.programadaEn) };
    setDrag({ id: it.id, min: minOf(it.programadaEn), moved: false });
  }
  function onMove(e: ReactPointerEvent, id: string) {
    const d = dragRef.current;
    if (!d) return;
    let min = d.origMin + ((e.clientY - d.startY) / hourH) * 60;
    min = Math.min(1435, Math.max(0, Math.round(min / SNAP) * SNAP));
    setDrag({ id, min, moved: Math.abs(e.clientY - d.startY) > 4 });
  }
  async function onUp(e: ReactPointerEvent, it: ProgramadaRow, dia: Date) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const cur = drag;
    setDrag(null);
    if (!cur || !cur.moved) {
      abrirEditar(it);
      return;
    }
    const iso = isoAt(dia, cur.min);
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, programadaEn: iso } : p)));
    await moverProgramada(it.id, iso);
  }

  const headerTxt =
    modo === "dia"
      ? fecha.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : `${dias[0]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${dias[6]!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  const subLineas = hourH >= 120 ? 4 : hourH >= 84 ? 2 : 1; // divisiones por hora

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Agenda
          </h2>
          <p className="mt-1 text-sm text-muted">
            Planificá las publicaciones hora por hora. Arrastrá para reprogramar.
          </p>
        </div>
        <Button onClick={() => abrirCrear(fecha, 12 * 60)}>
          <Plus className="size-4" />
          Programar
        </Button>
      </div>

      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navegar(-1)}
            className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setFecha(hoy)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-elevated"
          >
            Hoy
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
          <CalendarClock className="size-4 text-accent" />
          {headerTxt}
        </p>

        <Badge tone={items.length ? "brand" : "neutral"}>
          {items.length} {items.length === 1 ? "publicación" : "publicaciones"}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          {/* Zoom */}
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

          {/* Modo */}
          <div className="flex items-center gap-1 rounded-lg border border-line p-0.5">
            {(["dia", "semana"] as Modo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={
                  "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors " +
                  (modo === m ? "bg-elevated text-fg" : "text-muted hover:text-fg")
                }
              >
                {m === "dia" ? "Día" : "Semana"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Encabezado de días (semana) */}
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

      {/* Timeline */}
      <div
        ref={scroller}
        className="mt-2 max-h-[64vh] overflow-y-auto rounded-[var(--radius-lg)] border border-line/70 bg-surface shadow-soft"
      >
        <div className="flex" style={{ height: hourH * 24 }}>
          {/* Gutter de horas */}
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

          {/* Columnas */}
          {dias.map((dia) => {
            const delDia = items.filter((it) =>
              sameDay(new Date(it.programadaEn), dia),
            );
            const lay = calcularLayout(delDia, hourH);
            const esHoy = sameDay(dia, hoy);
            return (
              <div
                key={dia.toISOString()}
                className="relative flex-1 border-l border-line/60"
                onPointerDown={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const min =
                    Math.round((((e.clientY - r.top) / hourH) * 60) / SNAP) * SNAP;
                  abrirCrear(dia, Math.min(1435, Math.max(0, min)));
                }}
              >
                {/* Líneas de hora + subdivisiones */}
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h}>
                    <div
                      className="absolute inset-x-0 border-t border-line/60"
                      style={{ top: h * hourH }}
                    />
                    {Array.from({ length: subLineas - 1 }).map((_, s) => (
                      <div
                        key={s}
                        className="absolute inset-x-0 border-t border-dashed border-line/35"
                        style={{ top: h * hourH + ((s + 1) * hourH) / subLineas }}
                      />
                    ))}
                  </div>
                ))}

                {/* Línea de ahora */}
                {esHoy && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: (nowMin / 60) * hourH }}
                  >
                    <span className="size-2 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger/70" />
                  </div>
                )}

                {/* Bloques */}
                {delDia.map((it) => {
                  const l = lay.get(it.id);
                  if (!l) return null;
                  const min = drag?.id === it.id ? drag.min : l.min;
                  const color = COLOR_PLAT[it.plataforma];
                  const compact = modo === "semana" || hourH <= 36;
                  return (
                    <div
                      key={it.id}
                      onPointerDown={(e) => onDown(e, it)}
                      onPointerMove={(e) => onMove(e, it.id)}
                      onPointerUp={(e) => onUp(e, it, dia)}
                      className="absolute z-[5] cursor-grab touch-none select-none overflow-hidden rounded-md border bg-surface px-2 py-1 shadow-soft active:cursor-grabbing"
                      style={{
                        top: (min / 60) * hourH,
                        height: BLOCK_H,
                        left: `calc(100% * ${l.lane} / ${l.lanes} + 2px)`,
                        width: `calc(100% / ${l.lanes} - 4px)`,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-[10px] text-muted">
                          {fmtMin(min)}
                        </span>
                      </div>
                      <p className="truncate text-[11px] font-medium text-fg">
                        {it.videoTitulo || "Sin título"}
                        {!compact && (
                          <span className="font-normal text-muted">
                            {" · "}
                            {it.cuentaNombre ? `@${it.cuentaNombre}` : it.plataforma}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        Tocá un hueco para programar · arrastrá un bloque para mover la hora · clic
        en un bloque para editar · usá el zoom para afinar los minutos
      </p>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar publicación" : "Programar publicación"}
      >
        <div className="space-y-4">
          <p className="-mt-1 text-xs capitalize text-muted">
            {fFecha.toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          <Field label="Cliente">
            <select
              value={fClienteId}
              onChange={(e) => {
                setFClienteId(e.target.value);
                const c = clientes.find((x) => x.id === e.target.value);
                setFCuentaId(c?.cuentas[0]?.id ?? "");
              }}
              className={inputCls}
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>

          {clienteSel && clienteSel.cuentas.length === 0 ? (
            <p className="text-xs text-muted">
              Este cliente no tiene cuentas. Agregalas en Cuentas.
            </p>
          ) : (
            <Field label="Cuenta">
              <select
                value={fCuentaId}
                onChange={(e) => setFCuentaId(e.target.value)}
                className={inputCls}
              >
                {clienteSel?.cuentas.map((a) => (
                  <option key={a.id} value={a.id}>
                    @{a.nombre} · {a.plataforma}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hora">
              <input
                type="time"
                value={fHora}
                onChange={(e) => setFHora(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Título del video">
              <input
                value={fTitulo}
                onChange={(e) => setFTitulo(e.target.value)}
                placeholder="Ej. Gol de…"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Caption (opcional)">
            <textarea
              value={fCaption}
              onChange={(e) => setFCaption(e.target.value)}
              rows={2}
              placeholder="Texto del posteo…"
              className={inputCls + " h-auto py-2"}
            />
          </Field>

          <div className="flex items-center justify-between pt-1">
            {editId ? (
              <button
                type="button"
                onClick={borrar}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-danger"
              >
                <Trash2 className="size-4" />
                Eliminar
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar}>{editId ? "Guardar" : "Programar"}</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
