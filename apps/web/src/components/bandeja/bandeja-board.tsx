"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Inbox,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  despacharAhora,
  guardarCadencia,
  publicarYa,
  quitarDeCola,
  setCategoriaPublicacion,
  setPrioridad,
} from "@/server/cola";
import { claveCategoria } from "@/lib/categorias";
import { categoriasDeDestino } from "@/server/destinos";
import type { Cadencia } from "@scrapify/db";

export type ColaItem = {
  id: string;
  titulo: string;
  fuente: string;
  categoria: string | null;
  prioridad: boolean;
  fecha: string;
};

export type ActividadItem = {
  id: string;
  titulo: string;
  categoria: string | null;
  estado: "publicada" | "error";
  url: string | null;
  error: string | null;
  fecha: string;
};

export type DestinoCola = {
  id: string;
  nombre: string;
  tipo: "wordpress_cliente" | "sitio_propio";
  cadencia: Cadencia | null;
  publicadasHoy: number;
  proximaISO: string | null;
  items: ColaItem[];
  actividad: ActividadItem[];
};

const VIZ = [
  "var(--color-viz-1)",
  "var(--color-viz-2)",
  "var(--color-viz-3)",
  "var(--color-viz-5)",
  "var(--color-viz-4)",
  "var(--color-viz-6)",
];
const SIN = "Sin asignar";

const DEFAULT_CAD: Cadencia = {
  cantidad: 2,
  cadaMinutos: 60,
  franjaInicio: 8,
  franjaFin: 22,
  modo: "equilibrado",
  activo: false,
};

const inputCls =
  "rounded-lg border border-line bg-surface px-2 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30";

const dropId = (name: string) => (name === SIN ? "__sin__" : `col:${name}`);

// Clave canónica: colapsa variantes conocidas (Internacional/Internacionales,
// Política/Politicas) a un mismo término para no duplicar columnas.
const norm = (s: string) => claveCategoria(s);

// Quita duplicados por clave canónica (ej. "Internacional" e "Internacionales").
function dedupeNorm(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = norm(n);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}

function ColaCard({
  item,
  color,
  pending,
  onPublicar,
  onQuitar,
  onStar,
}: {
  item: ColaItem;
  color: string;
  pending: boolean;
  onPublicar: (i: ColaItem) => void;
  onQuitar: (i: ColaItem) => void;
  onStar: (i: ColaItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", isDragging && "opacity-50")}
    >
      <Card className="p-3">
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
          <p className="text-[13px] font-medium leading-snug text-fg">{item.titulo}</p>
          <p className="mt-1 text-[11px] text-muted">
            {item.fuente} · {item.fecha}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStar(item)}
            disabled={pending}
            aria-label="Prioridad"
            className={cn(
              "grid size-7 place-items-center rounded-md transition-colors hover:bg-elevated",
              item.prioridad ? "text-warning" : "text-muted",
            )}
          >
            <Star className="size-4" fill={item.prioridad ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() => onPublicar(item)}
            disabled={pending}
            aria-label="Publicar ya"
            className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-brand"
          >
            <Send className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onQuitar(item)}
            disabled={pending}
            aria-label="Sacar de la cola"
            className="ml-auto grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
        <span className="sr-only" style={{ color }} />
      </Card>
    </div>
  );
}

function Columna({
  name,
  color,
  count,
  children,
}: {
  name: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(name) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-full rounded-[var(--radius)] p-1 transition-colors",
        isOver && "bg-elevated/60 ring-2 ring-brand/30",
      )}
    >
      <div
        className="mb-2 flex items-center justify-between rounded-[var(--radius)] px-3 py-1.5"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <span className="truncate text-sm font-medium capitalize" style={{ color }}>
          {name}
        </span>
        <span className="text-xs font-medium" style={{ color }}>
          {count}
        </span>
      </div>
      <div className="min-h-16 space-y-2">{children}</div>
    </div>
  );
}

function FranjaPrioritarias({ children, count }: { children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: "__prio__" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-4 rounded-[var(--radius-lg)] border border-dashed p-3 transition-colors",
        isOver ? "border-warning bg-warning/10" : "border-line",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
        <Star className="size-4" fill="currentColor" />
        Prioritarias ({count})
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted">
          Arrastrá una nota acá para que salga primero.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">{children}</div>
      )}
    </div>
  );
}

export function BandejaBoard({ destinos }: { destinos: DestinoCola[] }) {
  const router = useRouter();
  const { message, show } = useToast();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState(destinos[0]?.id ?? "");

  const activo = destinos.find((d) => d.id === activeId) ?? destinos[0] ?? null;

  const [cad, setCad] = useState<Cadencia>(activo?.cadencia ?? DEFAULT_CAD);
  const [items, setItems] = useState<ColaItem[]>(activo?.items ?? []);
  const [wpCats, setWpCats] = useState<string[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [vista, setVista] = useState<"cola" | "actividad">("cola");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    setCad(activo?.cadencia ?? DEFAULT_CAD);
  }, [activeId, activo?.cadencia]);

  // Re-sembrar items cuando cambia el conjunto (cambio de destino o refresh tras despachar).
  const idsKey = (activo?.items ?? []).map((i) => i.id).join(",");
  useEffect(() => {
    setItems(activo?.items ?? []);
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function fetchCats(id: string) {
    setLoadingCats(true);
    categoriasDeDestino(id)
      .then((c) => setWpCats(c.map((x) => x.name)))
      .finally(() => setLoadingCats(false));
  }
  useEffect(() => {
    if (activo?.tipo === "wordpress_cliente") fetchCats(activeId);
    else setWpCats([]);
  }, [activeId, activo?.tipo]);

  // Reloj en vivo para la cuenta regresiva de la próxima tanda.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-despacho mientras la bandeja está abierta: si algún destino con Auto ON
  // ya está "listo", dispara el despacho (mismo efecto que el cron de Inngest).
  // Cooldown de 30s para no entrar en loop si una corrida no despacha nada.
  const firingRef = useRef(false);
  const lastFireRef = useRef(0);
  useEffect(() => {
    const listo = destinos.some(
      (d) =>
        d.cadencia?.activo &&
        d.proximaISO &&
        new Date(d.proximaISO).getTime() <= now &&
        d.items.length > 0,
    );
    if (!listo || firingRef.current || pending) return;
    if (Date.now() - lastFireRef.current < 30_000) return;
    firingRef.current = true;
    lastFireRef.current = Date.now();
    startTransition(async () => {
      const r = await despacharAhora();
      if (r.despachadas) show(`Despacho automático: ${r.despachadas}`);
      router.refresh();
      firingRef.current = false;
    });
  }, [now, destinos, pending, router, show]);

  if (!activo) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Bandeja de salida" subtitle="Notas listas, esperando su turno." />
        <EmptyState icon={Inbox} title="Sin destinos" description="Agregá un destino para encolar." />
      </div>
    );
  }

  const esWp = activo.tipo === "wordpress_cliente";
  const noPrio = items.filter((i) => !i.prioridad);
  const prio = items.filter((i) => i.prioridad);

  const matchCol = (cat: string | null, cols: string[]) =>
    cols.find((n) => norm(n) === norm(cat ?? "")) ?? SIN;

  let columnas: string[];
  if (esWp) {
    columnas = dedupeNorm(wpCats);
    const huerfanos = noPrio.some((i) => matchCol(i.categoria, columnas) === SIN);
    if (huerfanos || columnas.length === 0) columnas.push(SIN);
  } else {
    columnas = dedupeNorm(noPrio.map((i) => i.categoria ?? SIN));
    if (columnas.length === 0) columnas = [SIN];
  }
  const colColor = (c: string): string =>
    c === SIN
      ? "var(--color-muted)"
      : VIZ[columnas.indexOf(c) % VIZ.length] ?? "var(--color-muted)";

  function aplicarDrag(pubId: string, destino: string) {
    if (destino === "__prio__") {
      setItems((prev) => prev.map((i) => (i.id === pubId ? { ...i, prioridad: true } : i)));
      startTransition(() => setPrioridad(pubId, true));
      return;
    }
    const cat = destino === "__sin__" ? null : destino.replace(/^col:/, "");
    setItems((prev) =>
      prev.map((i) => (i.id === pubId ? { ...i, categoria: cat, prioridad: false } : i)),
    );
    startTransition(async () => {
      await setCategoriaPublicacion(pubId, cat);
      await setPrioridad(pubId, false);
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    if (!e.over) return;
    aplicarDrag(String(e.active.id), String(e.over.id));
  }

  function guardar() {
    startTransition(async () => {
      await guardarCadencia(activo!.id, cad);
      show("Ritmo guardado");
    });
  }
  function despachar() {
    startTransition(async () => {
      const r = await despacharAhora();
      show(`${r.despachadas} publicadas${r.errores ? ` · ${r.errores} con error` : ""}`);
      router.refresh();
    });
  }
  function publicar(item: ColaItem) {
    if (!window.confirm(`¿Publicar ahora "${item.titulo}"?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(async () => {
      const r = await publicarYa(item.id);
      show(r.ok ? "Publicada" : `Falló: ${r.error ?? ""}`);
      router.refresh();
    });
  }
  function quitar(item: ColaItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(async () => {
      await quitarDeCola(item.id);
      show("Sacada de la cola");
    });
  }
  function star(item: ColaItem) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, prioridad: !i.prioridad } : i)),
    );
    startTransition(() => setPrioridad(item.id, !item.prioridad));
  }

  const dragItem = items.find((i) => i.id === dragId) ?? null;

  const autoOn = activo.cadencia?.activo ?? false;
  const proximaTxt = (() => {
    if (!activo.proximaISO) return autoOn ? "Cola vacía" : "Manual";
    const rem = new Date(activo.proximaISO).getTime() - now;
    if (rem <= 0) return "Lista para salir";
    const s = Math.floor(rem / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return hh > 0 ? `en ${hh}h ${pad(mm)}m` : `en ${pad(mm)}:${pad(ss)}`;
  })();

  return (
    <div className="w-full">
      <PageHeader
        title="Bandeja de salida"
        subtitle="Tu tablero de control: lo que espera (arrastrá para ordenar) y lo que ya salió."
        action={
          <Button onClick={despachar} disabled={pending}>
            <Sparkles className="size-4" />
            Despachar ahora
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {destinos.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveId(d.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              d.id === activeId
                ? "border-brand/40 bg-brand/12 text-brand"
                : "border-line text-muted hover:bg-elevated hover:text-fg",
            )}
          >
            {d.nombre}
            <span className="ml-1.5 text-xs opacity-70">{d.items.length}</span>
          </button>
        ))}
        {esWp && (
          <button
            type="button"
            onClick={() => fetchCats(activeId)}
            disabled={loadingCats}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:bg-elevated hover:text-fg"
          >
            <RefreshCw className={cn("size-3.5", loadingCats && "animate-spin")} />
            Refrescar categorías
          </button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="En cola" value={String(items.length)} />
        <Stat label="Publicadas hoy" value={String(activo.publicadasHoy)} />
        <Stat label="Estado" value={autoOn ? "Auto ON" : "Manual"} />
        <Stat label="Próxima tanda" value={proximaTxt} />
      </div>

      {/* Toggle de vista: cola (kanban) vs actividad (auditoría) */}
      <div className="mb-5 inline-flex rounded-lg border border-line p-0.5">
        {(
          [
            ["cola", `En cola (${items.length})`],
            ["actividad", `Actividad (${activo.actividad.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setVista(k)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm transition-colors",
              vista === k ? "bg-elevated font-medium text-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {vista === "cola" ? (
        <>
          {/* Config de ritmo */}
          <Card className="mb-5 p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
              <label className="flex items-center gap-2 text-muted">
                Ritmo
                <input type="number" min={1} value={cad.cantidad}
                  onChange={(e) => setCad({ ...cad, cantidad: Math.max(1, +e.target.value) })}
                  className={cn(inputCls, "w-16")} />
                notas cada
                <input type="number" min={1} value={cad.cadaMinutos}
                  onChange={(e) => setCad({ ...cad, cadaMinutos: Math.max(1, +e.target.value) })}
                  className={cn(inputCls, "w-20")} />
                min
              </label>
              <label className="flex items-center gap-2 text-muted">
                Franja
                <input type="number" min={0} max={23} value={cad.franjaInicio}
                  onChange={(e) => setCad({ ...cad, franjaInicio: +e.target.value })}
                  className={cn(inputCls, "w-16")} />
                a
                <input type="number" min={0} max={23} value={cad.franjaFin}
                  onChange={(e) => setCad({ ...cad, franjaFin: +e.target.value })}
                  className={cn(inputCls, "w-16")} />
                h
              </label>
              <label className="flex items-center gap-2 text-muted">
                Modo
                <select value={cad.modo}
                  onChange={(e) => setCad({ ...cad, modo: e.target.value as Cadencia["modo"] })}
                  className={inputCls}>
                  <option value="equilibrado">equilibrado por categoría</option>
                  <option value="random">random</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-fg">
                <input type="checkbox" checked={cad.activo}
                  onChange={(e) => setCad({ ...cad, activo: e.target.checked })}
                  className="size-4 accent-[var(--color-brand)]" />
                Auto-despacho
              </label>
              <Button size="sm" onClick={guardar} disabled={pending} className="ml-auto">
                Guardar ritmo
              </Button>
            </div>
          </Card>

          {items.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Cola vacía"
              description="Enviá notas a la cola desde Moderación o Biblioteca."
            />
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
              onDragEnd={onDragEnd}
              onDragCancel={() => setDragId(null)}
            >
              <FranjaPrioritarias count={prio.length}>
                {prio.map((item) => (
                  <div key={item.id} className="w-60">
                    <ColaCard
                      item={item}
                      color="var(--color-warning)"
                      pending={pending}
                      onPublicar={publicar}
                      onQuitar={quitar}
                      onStar={star}
                    />
                  </div>
                ))}
              </FranjaPrioritarias>

              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                {columnas.map((c) => {
                  const enCol = noPrio.filter((i) => matchCol(i.categoria, columnas) === c);
                  return (
                    <Columna key={c} name={c} color={colColor(c)} count={enCol.length}>
                      {enCol.map((item) => (
                        <ColaCard
                          key={item.id}
                          item={item}
                          color={colColor(c)}
                          pending={pending}
                          onPublicar={publicar}
                          onQuitar={quitar}
                          onStar={star}
                        />
                      ))}
                    </Columna>
                  );
                })}
              </div>

              <DragOverlay>
                {dragItem ? (
                  <Card className="w-60 p-3 shadow-float">
                    <p className="text-[13px] font-medium leading-snug text-fg">
                      {dragItem.titulo}
                    </p>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      ) : activo.actividad.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Sin actividad"
          description="Todavía no se publicó nada por este destino."
        />
      ) : (
        <Card className="divide-y divide-line/60">
          {activo.actividad.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              {a.estado === "publicada" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-danger" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{a.titulo}</p>
                {a.estado === "error" && a.error && (
                  <p className="truncate text-xs text-danger">{a.error}</p>
                )}
              </div>
              {a.categoria && (
                <Badge className="hidden capitalize sm:inline-flex">{a.categoria}</Badge>
              )}
              <span className="w-20 shrink-0 text-right text-xs text-muted">{a.fecha}</span>
              {a.url ? (
                <a href={a.url} target="_blank" rel="noreferrer"
                  className="shrink-0 text-brand hover:text-fg" aria-label="Ver publicación">
                  <ExternalLink className="size-4" />
                </a>
              ) : (
                <span className="size-4 shrink-0" />
              )}
            </div>
          ))}
        </Card>
      )}

      <Toast message={message} />
    </div>
  );
}
