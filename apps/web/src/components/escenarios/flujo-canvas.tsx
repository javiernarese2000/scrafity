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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence } from "framer-motion";
import { Plus, Workflow } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Toast, useToast } from "@/components/ui/toast";
import {
  actualizarEscenario,
  conectar,
  crearEscenario,
  desconectar,
  eliminarEscenario,
  guardarPosicion,
} from "@/server/flujo";
import { ConfigPanel } from "./config-panel";
import { nodeTypes } from "./nodes";
import type { EscenarioConfig, GraphData } from "./types";

type EdgeData = { escenarioId: string; lado: "fuente" | "destino"; refId: string };

const EDGE_STYLE = { stroke: "var(--color-brand)", strokeWidth: 2 };

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
        moderacion: e.moderacion,
        cupoDiario: e.cupoDiario,
        activo: e.activo,
      },
    })),
  ];
}

function buildEdges(data: GraphData): Edge[] {
  const edges: Edge[] = [];
  for (const e of data.escenarios) {
    for (const fid of e.fuenteIds) {
      edges.push({
        id: `e-${e.id}-fuente-${fid}`,
        source: `fuente:${fid}`,
        target: `escenario:${e.id}`,
        animated: true,
        style: EDGE_STYLE,
        data: { escenarioId: e.id, lado: "fuente", refId: fid },
      });
    }
    for (const did of e.destinoIds) {
      edges.push({
        id: `e-${e.id}-destino-${did}`,
        source: `escenario:${e.id}`,
        target: `destino:${did}`,
        animated: true,
        style: EDGE_STYLE,
        data: { escenarioId: e.id, lado: "destino", refId: did },
      });
    }
  }
  return edges;
}

export function FlujoCanvas({ data }: { data: GraphData }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(buildNodes(data));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(buildEdges(data));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { message, show } = useToast();

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
          animated: true,
          style: EDGE_STYLE,
          data: { escenarioId: tid!, lado: "fuente", refId: sid! },
        };
      } else if (stype === "escenario" && ttype === "destino") {
        edge = {
          id: `e-${sid}-destino-${tid}`,
          source: c.source,
          target: c.target,
          animated: true,
          style: EDGE_STYLE,
          data: { escenarioId: sid!, lado: "destino", refId: tid! },
        };
      }
      if (!edge) return;
      const d = edge.data;
      setEdges((eds) => addEdge(edge!, eds));
      startTransition(() => conectar(d.escenarioId, d.lado, d.refId));
    },
    [setEdges],
  );

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    startTransition(() => {
      for (const e of deleted) {
        const d = e.data as EdgeData | undefined;
        if (d) void desconectar(d.escenarioId, d.lado, d.refId);
      }
    });
  }, []);

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      startTransition(() => {
        for (const n of deleted) {
          if (n.type === "escenario") {
            void eliminarEscenario(n.id.split(":")[1]!);
          }
        }
      });
      setSelectedId(null);
    },
    [],
  );

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

  const selected = nodes.find(
    (n) => n.id === selectedId && n.type === "escenario",
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

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Escenarios
          </h2>
          <p className="mt-1 text-sm text-muted">
            Conectá fuentes → escenarios → destinos. Arrastrá entre los puntos
            para enlazar.
          </p>
        </div>
        <Button onClick={addEscenario}>
          <Plus className="size-4" />
          Agregar escenario
        </Button>
      </div>

      <div className="relative h-[calc(100dvh-13rem)] min-h-[560px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodesDelete={onNodesDelete}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) =>
            setSelectedId(node.type === "escenario" ? node.id : null)
          }
          onPaneClick={() => setSelectedId(null)}
          colorMode="system"
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ animated: true, style: EDGE_STYLE }}
          connectionLineStyle={EDGE_STYLE}
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
      </div>

      <Toast message={message} />
    </div>
  );
}
