"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence } from "framer-motion";
import { LayoutGrid, Plus, Workflow, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/ui/button";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  actualizarEscenario,
  conectar,
  crearEscenario,
  desconectar,
  eliminarEscenario,
  guardarPosicion,
  setEdgeKeywords,
} from "@/server/flujo";
import { ConfigPanel } from "./config-panel";
import { edgeTypes } from "./edges";
import { nodeTypes } from "./nodes";
import type { EscenarioConfig, GraphData } from "./types";

type EdgeData = {
  escenarioId: string;
  lado: "fuente" | "destino";
  refId: string;
  color: string;
  keywords: string[];
};

const COL_FUENTE = "var(--color-success)";
const COL_DESTINO = "var(--color-accent)";
const CONNECTION_STYLE = { stroke: "var(--color-brand)", strokeWidth: 2 };

function buildNodes(data: GraphData): Node[] {
  return [
    ...data.fuentes.map((f) => ({
      id: `fuente:${f.id}`,
      type: "fuente",
      position: { x: f.x, y: f.y },
      deletable: false,
      data: { nombre: f.nombre, tipo: f.tipo, estado: f.estado },
    })),
    ...data.destinos.map((d) => ({
      id: `destino:${d.id}`,
      type: "destino",
      position: { x: d.x, y: d.y },
      deletable: false,
      data: { nombre: d.nombre, tipo: d.tipo, estado: d.estado },
    })),
    ...data.escenarios.map((e) => ({
      id: `escenario:${e.id}`,
      type: "escenario",
      position: { x: e.x, y: e.y },
      data: {
        nombre: e.nombre,
        tema: e.tema,
        nVersiones: e.nVersiones,
        tono: e.tono,
        proveedor: e.proveedor,
        cupoDiario: e.cupoDiario,
        moderacion: e.moderacion,
        activo: e.activo,
      },
    })),
  ];
}

function buildEdges(data: GraphData): Edge[] {
  const edges: Edge[] = [];
  for (const e of data.escenarios) {
    for (const l of e.linksFuente) {
      edges.push({
        id: `e-${e.id}-fuente-${l.refId}`,
        source: `fuente:${l.refId}`,
        target: `escenario:${e.id}`,
        type: "pulse",
        data: {
          escenarioId: e.id,
          lado: "fuente",
          refId: l.refId,
          color: COL_FUENTE,
          keywords: l.keywords,
        },
      });
    }
    for (const l of e.linksDestino) {
      edges.push({
        id: `e-${e.id}-destino-${l.refId}`,
        source: `escenario:${e.id}`,
        target: `destino:${l.refId}`,
        type: "pulse",
        data: {
          escenarioId: e.id,
          lado: "destino",
          refId: l.refId,
          color: COL_DESTINO,
          keywords: l.keywords,
        },
      });
    }
  }
  return edges;
}

function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const el = document.documentElement;
    const update = () =>
      setMode(el.classList.contains("dark") ? "dark" : "light");
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return mode;
}

export function FlujoCanvas({ data }: { data: GraphData }) {
  const mode = useThemeMode();
  const rf = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ edgeId: string; x: number; y: number } | null>(
    null,
  );

  const openMenuAt = useCallback(
    (edgeId: string, ev: { clientX: number; clientY: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenu({ edgeId, x: ev.clientX - rect.left, y: ev.clientY - rect.top });
    },
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(buildNodes(data));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(buildEdges(data));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { message, show } = useToast();

  // Filtro de keywords sobre una conexión
  const [filterEdge, setFilterEdge] = useState<Edge | null>(null);
  const [kw, setKw] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");

  const onConnect = useCallback(
    (c: Connection) => {
      const [stype, sid] = c.source.split(":");
      const [ttype, tid] = c.target.split(":");
      let edge: (Edge & { data: EdgeData }) | null = null;
      if (stype === "fuente" && ttype === "escenario") {
        edge = {
          id: `e-${tid}-fuente-${sid}`,
          source: c.source,
          target: c.target,
          type: "pulse",
          data: {
            escenarioId: tid!,
            lado: "fuente",
            refId: sid!,
            color: COL_FUENTE,
            keywords: [],
          },
        };
      } else if (stype === "escenario" && ttype === "destino") {
        edge = {
          id: `e-${sid}-destino-${tid}`,
          source: c.source,
          target: c.target,
          type: "pulse",
          data: {
            escenarioId: sid!,
            lado: "destino",
            refId: tid!,
            color: COL_DESTINO,
            keywords: [],
          },
        };
      }
      if (!edge) return;
      const d = edge.data;
      setEdges((eds) => addEdge(edge!, eds));
      startTransition(() => conectar(d.escenarioId, d.lado, d.refId));
    },
    [setEdges],
  );

  const removeEdge = useCallback(
    (e: Edge) => {
      const d = e.data as EdgeData;
      setEdges((eds) => eds.filter((x) => x.id !== e.id));
      startTransition(() => desconectar(d.escenarioId, d.lado, d.refId));
    },
    [setEdges],
  );

  const openFilter = useCallback((e: Edge) => {
    setFilterEdge(e);
    setKw(((e.data as EdgeData).keywords as string[]) ?? []);
    setKwInput("");
  }, []);

  function saveFilter() {
    if (!filterEdge) return;
    const d = filterEdge.data as EdgeData;
    setEdges((eds) =>
      eds.map((x) =>
        x.id === filterEdge.id ? { ...x, data: { ...x.data, keywords: kw } } : x,
      ),
    );
    startTransition(() => setEdgeKeywords(d.escenarioId, d.lado, d.refId, kw));
    setFilterEdge(null);
  }

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    startTransition(() => {
      for (const e of deleted) {
        const d = e.data as EdgeData | undefined;
        if (d) void desconectar(d.escenarioId, d.lado, d.refId);
      }
    });
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    startTransition(() => {
      for (const n of deleted) {
        if (n.type === "escenario") void eliminarEscenario(n.id.split(":")[1]!);
      }
    });
    setSelectedId(null);
  }, []);

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    void guardarPosicion(node.id, node.position.x, node.position.y);
  }, []);

  function addEscenario() {
    startTransition(async () => {
      const { id } = await crearEscenario();
      setNodes((nds) => [
        ...nds,
        {
          id: `escenario:${id}`,
          type: "escenario",
          position: { x: 480, y: 60 + nds.length * 30 },
          data: {
            nombre: "Nuevo escenario",
            tema: null,
            nVersiones: 3,
            tono: "Neutro",
            proveedor: "auto",
            cupoDiario: null,
            moderacion: true,
            activo: true,
          },
        },
      ]);
      show("Escenario creado");
    });
  }

  function autoOrdenar() {
    let fy = 40;
    let ey = 40;
    let dy = 40;
    const next = nodes.map((n) => {
      let position: { x: number; y: number };
      if (n.type === "fuente") {
        position = { x: 40, y: fy };
        fy += 110;
      } else if (n.type === "destino") {
        position = { x: 920, y: dy };
        dy += 110;
      } else {
        position = { x: 480, y: ey };
        ey += 170;
      }
      return { ...n, position };
    });
    setNodes(next);
    next.forEach((n) => void guardarPosicion(n.id, n.position.x, n.position.y));
    window.setTimeout(() => rf.current?.fitView({ duration: 400 }), 60);
  }

  const selected = nodes.find(
    (n) => n.id === selectedId && n.type === "escenario",
  );

  const menuEdge = menu
    ? (edges.find((e) => e.id === menu.edgeId) ?? null)
    : null;

  const focus = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set<string>([selectedId]);
    const edgeIds = new Set<string>();
    for (const e of edges) {
      if (e.source === selectedId || e.target === selectedId) {
        edgeIds.add(e.id);
        ids.add(e.source);
        ids.add(e.target);
      }
    }
    return { ids, edgeIds };
  }, [selectedId, edges]);

  // Marcar escenarios sin fuente o sin destino
  const escMeta = useMemo(() => {
    const m = new Map<string, { hasF: boolean; hasD: boolean }>();
    for (const n of nodes) {
      if (n.type === "escenario") m.set(n.id, { hasF: false, hasD: false });
    }
    for (const e of edges) {
      const tgt = m.get(e.target);
      if (tgt) tgt.hasF = true;
      const src = m.get(e.source);
      if (src) src.hasD = true;
    }
    return m;
  }, [nodes, edges]);

  const displayNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => {
        const meta = n.type === "escenario" ? escMeta.get(n.id) : undefined;
        const incompleto =
          n.type === "escenario" ? !meta || !meta.hasF || !meta.hasD : undefined;
        return {
          ...n,
          data:
            n.type === "escenario" ? { ...n.data, incompleto } : n.data,
          style: {
            ...n.style,
            opacity: focus && !focus.ids.has(n.id) ? 0.3 : 1,
            transition: "opacity .2s",
          },
        };
      }),
    [nodes, focus, escMeta],
  );

  const displayEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        ...e,
        data: {
          ...e.data,
          dim: focus ? !focus.edgeIds.has(e.id) : false,
          onMenu: openMenuAt,
        },
      })),
    [edges, focus, openMenuAt],
  );

  function patchSelected(patch: Partial<EscenarioConfig>) {
    if (!selected) return;
    const realId = selected.id.split(":")[1]!;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selected.id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
    startTransition(() => actualizarEscenario(realId, patch));
  }

  function deleteSelected() {
    if (!selected) return;
    const realId = selected.id.split(":")[1]!;
    setNodes((nds) => nds.filter((n) => n.id !== selected.id));
    setEdges((eds) =>
      eds.filter((e) => (e.data as EdgeData | undefined)?.escenarioId !== realId),
    );
    setSelectedId(null);
    startTransition(() => eliminarEscenario(realId));
    show("Escenario eliminado");
  }

  function addKw() {
    const t = kwInput.trim().toLowerCase();
    if (!t || kw.includes(t)) return;
    setKw([...kw, t]);
    setKwInput("");
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Escenarios
          </h2>
          <p className="mt-1 text-sm text-muted">
            Conectá fuentes → escenarios → destinos. El 🔎 en cada línea filtra
            por palabras clave.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={autoOrdenar}>
            <LayoutGrid className="size-4" />
            Auto-ordenar
          </Button>
          <Button onClick={addEscenario}>
            <Plus className="size-4" />
            Agregar escenario
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-[calc(100dvh-13rem)] min-h-[560px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-canvas"
      >
        <ReactFlow
          onInit={(inst) => {
            rf.current = inst;
          }}
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={mode}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodesDelete={onNodesDelete}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "pulse" }}
          connectionLineStyle={CONNECTION_STYLE}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>

        <AnimatePresence>
          {selected && (
            <ConfigPanel
              value={selected.data as unknown as EscenarioConfig}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onClose={() => setSelectedId(null)}
            />
          )}
        </AnimatePresence>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-muted">
            <Workflow className="size-8" />
            <p className="mt-3 text-sm">
              Agregá fuentes y destinos, y creá tu primer escenario.
            </p>
          </div>
        )}

        {menu && menuEdge && (
          <>
            <div
              className="absolute inset-0 z-30"
              onClick={() => setMenu(null)}
            />
            <div
              className="absolute z-40 w-52 rounded-[var(--radius)] border border-line bg-surface p-1.5 shadow-float"
              style={{ left: menu.x, top: menu.y }}
            >
              <p className="px-2.5 py-1.5 text-xs text-muted">Conexión</p>
              <button
                type="button"
                onClick={() => {
                  openFilter(menuEdge);
                  setMenu(null);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-fg transition-colors hover:bg-elevated"
              >
                <span>Palabras clave</span>
                {((menuEdge.data as EdgeData).keywords?.length ?? 0) > 0 && (
                  <span className="rounded-md bg-elevated px-1.5 text-xs text-muted">
                    {(menuEdge.data as EdgeData).keywords.length}
                  </span>
                )}
              </button>
              <p className="px-2.5 pb-1 pt-0.5 text-[11px] text-muted">
                Más filtros pronto
              </p>
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                onClick={() => {
                  removeEdge(menuEdge);
                  setMenu(null);
                }}
                className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
              >
                Quitar conexión
              </button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!filterEdge}
        onClose={() => setFilterEdge(null)}
        title="Filtro de keywords"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Solo pasan por esta conexión las notas que contengan alguna de estas
            palabras. Sin keywords, pasa todo.
          </p>
          <Field label="Palabras clave">
            <div className="flex flex-wrap items-center gap-2">
              {kw.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs text-fg"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setKw(kw.filter((x) => x !== t))}
                    aria-label={`Quitar ${t}`}
                    className="text-muted hover:text-danger"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKw();
                  }
                }}
                placeholder="agregar…"
                className={cn(inputCls, "h-8 w-28")}
              />
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFilterEdge(null)}>
              Cancelar
            </Button>
            <Button onClick={saveFilter}>Guardar filtro</Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
