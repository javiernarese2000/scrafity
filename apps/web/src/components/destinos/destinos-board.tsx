"use client";

import { Globe, Plus, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { destinosData } from "@/data/destinos";

export function DestinosBoard() {
  const { message, show } = useToast();

  const wp = destinosData.filter((d) => d.tipo === "wordpress_cliente").length;
  const propios = destinosData.filter((d) => d.tipo === "sitio_propio").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Destinos"
        subtitle="WordPress de clientes (push) y sitios propios headless (pull)."
        action={
          <Button onClick={() => show("Alta de destino — próximamente")}>
            <Plus className="size-4" />
            Agregar destino
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Total" value={String(destinosData.length)} />
        <Stat label="WordPress" value={String(wp)} />
        <Stat label="Sitios propios" value={String(propios)} />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-line/60">
          {destinosData.map((d) => {
            const esWp = d.tipo === "wordpress_cliente";
            return (
              <div key={d.id} className="flex items-center gap-4 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                  {esWp ? (
                    <Globe className="size-4" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {d.nombre}
                  </p>
                  <p className="truncate font-mono text-xs text-muted">
                    {d.endpoint}
                  </p>
                </div>
                <Badge className="hidden sm:inline-flex">
                  {esWp ? "WordPress" : "Sitio propio"}
                </Badge>
                <div className="hidden w-24 text-right md:block">
                  <p className="font-mono text-sm text-fg">
                    {d.publicadas.toLocaleString("es")}
                  </p>
                  <p className="text-xs text-muted">publicadas</p>
                </div>
                <span className="hidden w-20 text-right text-xs text-muted lg:block">
                  {d.ultimaPublicacion}
                </span>
                <Badge tone={d.estado === "activo" ? "success" : "danger"}>
                  {d.estado === "activo" ? "activo" : "error"}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      <Toast message={message} />
    </div>
  );
}
