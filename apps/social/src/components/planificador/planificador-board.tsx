"use client";

import { Badge } from "@scrapify/ui/badge";
import { Button } from "@scrapify/ui/button";
import { Field, Modal, inputCls } from "@scrapify/ui/modal";
import { Toast, useToast } from "@scrapify/ui/toast";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
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

const HOUR_H = 56;
const GUTTER = 52;
const BLOCK_H = 46;
const SNAP = 5;
const DUR = (BLOCK_H / HOUR_H) * 60; // minutos "ocupados" por un bloque

const COLOR_PLAT: Record<Plataforma, string> = {
  instagram: "#d6336c",
  facebook: "#3b5998",
  tiktok: "#0ea5b7",
};

function minOf(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
function mismaFecha(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Layout = { lane: number; lanes: number; min: number };

function calcularLayout(items: ProgramadaRow[]): Map<string, Layout> {
  const sorted = [...items].sort((a, b) => minOf(a.programadaEn) - minOf(b.programadaEn));
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
      laneEnds[lane] = m + DUR;
      out.set(it.id, { lane, lanes: 0, min: m });
    }
    const lanes = laneEnds.length;
    for (const it of cluster) out.get(it.id)!.lanes = lanes;
    cluster = [];
    curEnd = -1;
  };
  for (const it of sorted) {
    const m = minOf(it.programadaEn);
    if (cluster.length && m < curEnd) {
      cluster.push(it);
      curEnd = Math.max(curEnd, m + DUR);
    } else {
      cerrar();
      cluster = [it];
      curEnd = m + DUR;
    }
  }
  cerrar();
  return out;
}

export function PlanificadorBoard({ clientes }: { clientes: ClienteConCuentas[] }) {
  const { message, show } = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const timeline = useRef<HTMLDivElement>(null);

  const [fecha, setFecha] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });
  const [items, setItems] = useState<ProgramadaRow[]>([]);
  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  const [drag, setDrag] = useState<{ id: string; min: number; moved: boolean } | null>(null);
  const dragRef = useRef<{ id: string; startY: number; origMin: number } | null>(null);

  // Modal crear/editar
  const [editId, setEditId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fClienteId, setFClienteId] = useState("");
  const [fCuentaId, setFCuentaId] = useState("");
  const [fHora, setFHora] = useState("12:00");
  const [fTitulo, setFTitulo] = useState("");
  const [fCaption, setFCaption] = useState("");

  const hoy = new Date();
  const esHoy = mismaFecha(fecha, hoy);

  async function recargar(f: Date) {
    const desde = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    const hasta = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 1);
    const rows = await listarProgramadas(desde.toISOString(), hasta.toISOString());
    setItems(rows);
  }

  useEffect(() => {
    recargar(fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  useEffect(() => {
    const t = setInterval(() => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * HOUR_H;
  }, []);

  const layout = calcularLayout(items);

  function cambiarDia(delta: number) {
    setFecha((f) => new Date(f.getFullYear(), f.getMonth(), f.getDate() + delta));
  }

  function abrirCrear(minInicial?: number) {
    const c0 = clientes[0];
    setEditId(null);
    setFClienteId(c0?.id ?? "");
    setFCuentaId(c0?.cuentas[0]?.id ?? "");
    setFHora(fmtMin(minInicial ?? 12 * 60));
    setFTitulo("");
    setFCaption("");
    setModalOpen(true);
  }

  function abrirEditar(it: ProgramadaRow) {
    setEditId(it.id);
    setFClienteId(it.clienteId);
    setFCuentaId(it.socialAccountId ?? "");
    setFHora(fmtMin(minOf(it.programadaEn)));
    setFTitulo(it.videoTitulo ?? "");
    setFCaption(it.caption ?? "");
    setModalOpen(true);
  }

  const clienteSel = clientes.find((c) => c.id === fClienteId);

  async function guardar() {
    const cuenta = clienteSel?.cuentas.find((a) => a.id === fCuentaId);
    if (!clienteSel) return show("Elegí un cliente");
    if (!cuenta) return show("Elegí una cuenta");
    const [hh, mm] = fHora.split(":").map(Number);
    const min = (hh ?? 0) * 60 + (mm ?? 0);
    const iso = isoAt(fecha, min);

    if (editId) {
      await actualizarProgramada(editId, {
        videoTitulo: fTitulo,
        caption: fCaption,
        plataforma: cuenta.plataforma,
        socialAccountId: cuenta.id,
        programadaEnISO: iso,
      });
      show("Publicación actualizada");
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
    recargar(fecha);
  }

  async function borrar() {
    if (!editId) return;
    await eliminarProgramada(editId);
    setModalOpen(false);
    setItems((prev) => prev.filter((p) => p.id !== editId));
    show("Eliminada");
  }

  // ---- Drag de bloques ----
  function onBlockDown(e: ReactPointerEvent, it: ProgramadaRow) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { id: it.id, startY: e.clientY, origMin: minOf(it.programadaEn) };
    setDrag({ id: it.id, min: minOf(it.programadaEn), moved: false });
  }
  function onBlockMove(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const deltaMin = ((e.clientY - d.startY) / HOUR_H) * 60;
    let min = d.origMin + deltaMin;
    min = Math.round(min / SNAP) * SNAP;
    min = Math.min(1435, Math.max(0, min));
    setDrag({ id: d.id, min, moved: Math.abs(e.clientY - d.startY) > 4 });
  }
  async function onBlockUp(e: ReactPointerEvent, it: ProgramadaRow) {
    const d = dragRef.current;
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
    const iso = isoAt(fecha, cur.min);
    setItems((prev) =>
      prev.map((p) => (p.id === it.id ? { ...p, programadaEn: iso } : p)),
    );
    await moverProgramada(it.id, iso);
  }

  function clickVacio(e: ReactPointerEvent) {
    if (!timeline.current) return;
    const r = timeline.current.getBoundingClientRect();
    const min = Math.round((((e.clientY - r.top) / HOUR_H) * 60) / SNAP) * SNAP;
    abrirCrear(Math.min(1435, Math.max(0, min)));
  }

  const fechaTxt = fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Agenda
          </h2>
          <p className="mt-1 text-sm text-muted">
            Planificá las publicaciones hora por hora. Arrastrá para reprogramar.
          </p>
        </div>
        <Button onClick={() => abrirCrear()}>
          <Plus className="size-4" />
          Programar
        </Button>
      </div>

      {/* Barra de día */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => cambiarDia(-1)}
          className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() =>
            setFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
          }
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-elevated"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => cambiarDia(1)}
          className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:bg-elevated hover:text-fg"
        >
          <ChevronRight className="size-4" />
        </button>
        <p className="ml-1 flex items-center gap-2 text-sm font-medium capitalize text-fg">
          <CalendarClock className="size-4 text-accent" />
          {fechaTxt}
        </p>
        <Badge tone={items.length ? "brand" : "neutral"}>
          {items.length} {items.length === 1 ? "publicación" : "publicaciones"}
        </Badge>
      </div>

      {/* Timeline */}
      <div
        ref={scroller}
        className="max-h-[68vh] overflow-y-auto rounded-[var(--radius-lg)] border border-line/70 bg-surface shadow-soft"
      >
        <div
          ref={timeline}
          className="relative"
          style={{ height: HOUR_H * 24 }}
          onPointerDown={clickVacio}
        >
          {/* Horas */}
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-line/60"
              style={{ top: h * HOUR_H, height: HOUR_H }}
            >
              <span className="absolute -top-2 left-2 font-mono text-[11px] text-muted">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}

          {/* Línea de ahora */}
          {esHoy && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: (nowMin / 60) * HOUR_H }}
            >
              <span className="ml-[44px] size-2 rounded-full bg-danger" />
              <span className="h-px flex-1 bg-danger/70" />
            </div>
          )}

          {/* Bloques */}
          {items.map((it) => {
            const lay = layout.get(it.id);
            if (!lay) return null;
            const min = drag?.id === it.id ? drag.min : lay.min;
            const color = COLOR_PLAT[it.plataforma];
            return (
              <div
                key={it.id}
                onPointerDown={(e) => onBlockDown(e, it)}
                onPointerMove={onBlockMove}
                onPointerUp={(e) => onBlockUp(e, it)}
                className="absolute z-[5] cursor-grab touch-none select-none overflow-hidden rounded-lg border bg-surface px-2.5 py-1.5 shadow-soft active:cursor-grabbing"
                style={{
                  top: (min / 60) * HOUR_H,
                  height: BLOCK_H,
                  left: `calc(${GUTTER}px + (100% - ${GUTTER}px - 8px) * ${lay.lane} / ${lay.lanes})`,
                  width: `calc((100% - ${GUTTER}px - 8px) / ${lay.lanes} - 6px)`,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-[11px] text-muted">
                    {fmtMin(min)}
                  </span>
                </div>
                <p className="truncate text-xs font-medium text-fg">
                  {it.videoTitulo || "Sin título"}
                  <span className="font-normal text-muted">
                    {" "}
                    · {it.cuentaNombre ? `@${it.cuentaNombre}` : it.plataforma}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted">
        Tocá un hueco para programar ahí · arrastrá un bloque para mover la hora ·
        clic en un bloque para editar
      </p>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar publicación" : "Programar publicación"}
      >
        <div className="space-y-4">
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
