"use client";

import { motion } from "framer-motion";
import { Coins, Sparkles, Wallet, Zap } from "lucide-react";
import { useState } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokens, formatUSD } from "@/lib/costos";

export type DiaCosto = { dia: string; costo: number };
export type ProveedorCosto = { proveedor: string; label: string; costo: number; color: string };

function MiniBars({ data }: { data: DiaCosto[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.costo), 0.0001);
  const activo = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Últimos 7 días</span>
        <span className="font-mono text-fg">
          {activo ? `${activo.dia} · ${formatUSD(activo.costo)}` : formatUSD(data.reduce((a, d) => a + d.costo, 0))}
        </span>
      </div>
      <div className="flex h-28 items-end gap-2">
        {data.map((d, i) => {
          const h = Math.max(4, (d.costo / max) * 100);
          return (
            <div
              key={d.dia}
              className="flex flex-1 flex-col items-center gap-1.5"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              <div className="flex h-full w-full items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                  className={
                    "w-full cursor-pointer rounded-t-[3px] transition-opacity " +
                    (hover === i ? "opacity-100" : "opacity-70 hover:opacity-100")
                  }
                  style={{ backgroundColor: "var(--color-brand)" }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted">{d.dia}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Barras({ data }: { data: ProveedorCosto[] }) {
  const total = data.reduce((a, d) => a + d.costo, 0) || 1;
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.proveedor}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-fg">
              <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.label}
            </span>
            <span className="font-mono text-muted">{formatUSD(d.costo)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.costo / total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: d.color }}
            />
          </div>
        </div>
      ))}
      {data.every((d) => d.costo === 0) && (
        <p className="py-4 text-center text-sm text-muted">Sin generaciones hoy todavía.</p>
      )}
    </div>
  );
}

export function CostosIA({
  costoHoy,
  tokensHoy,
  notasHoy,
  costoPorNota,
  serie7d,
  porProveedor,
}: {
  costoHoy: number;
  tokensHoy: number;
  notasHoy: number;
  costoPorNota: number;
  serie7d: DiaCosto[];
  porProveedor: ProveedorCosto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gasto de IA</CardTitle>
        <span className="grid size-8 place-items-center rounded-lg bg-elevated text-brand">
          <Sparkles className="size-4" />
        </span>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Gasto hoy"
            value={formatUSD(costoHoy)}
            icon={Wallet}
            color="var(--color-brand)"
          />
          <MetricCard
            label="Tokens hoy"
            value={formatTokens(tokensHoy)}
            icon={Zap}
            color="var(--color-warning)"
          />
          <MetricCard
            label="Notas generadas"
            value={String(notasHoy)}
            hint="hoy"
            icon={Sparkles}
            color="var(--color-info)"
          />
          <MetricCard
            label="Costo por nota"
            value={formatUSD(costoPorNota)}
            hint="promedio hoy"
            icon={Coins}
            color="var(--color-success)"
          />
        </div>

        <div className="grid gap-6 border-t border-line/60 pt-5 md:grid-cols-2">
          <MiniBars data={serie7d} />
          <div>
            <p className="mb-3 text-xs text-muted">Por proveedor · hoy</p>
            <Barras data={porProveedor} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
