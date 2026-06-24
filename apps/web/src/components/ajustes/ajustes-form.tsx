"use client";

import { DownloadCloud, KeyRound, Sparkles, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { inputCls } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { guardarAjustes } from "@/server/ajustes";
import type { AjustesConfig } from "@scrapify/db";

function Fila({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 py-4 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function IconHead({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-elevated text-brand">
      {children}
    </span>
  );
}

export function AjustesForm({
  config,
  proveedores,
}: {
  config: AjustesConfig;
  proveedores: { claude: boolean; deepseek: boolean };
}) {
  const [c, setC] = useState<AjustesConfig>(config);
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();

  function set<K extends keyof AjustesConfig>(k: K, v: AjustesConfig[K]) {
    setC((prev) => ({ ...prev, [k]: v }));
  }
  function guardar() {
    startTransition(async () => {
      await guardarAjustes(c);
      show("Ajustes guardados");
    });
  }

  const num = "w-20 text-right";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Ajustes"
        subtitle="Configuración global de la plataforma. Afecta a la generación, la ingesta y la retención."
        action={
          <Button onClick={guardar} disabled={pending}>
            Guardar cambios
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generación</CardTitle>
            <IconHead>
              <Sparkles className="size-4" />
            </IconHead>
          </CardHeader>
          <CardBody>
            <Fila
              label="Similitud objetivo"
              hint="La IA reintenta hasta que la nota copie menos de este % de frases del original."
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={Math.round(c.similitudObjetivo * 100)}
                  onChange={(e) => set("similitudObjetivo", +e.target.value / 100)}
                  className="w-40 accent-[var(--color-brand)]"
                />
                <span className="w-10 text-right font-mono text-sm font-medium text-fg">
                  {Math.round(c.similitudObjetivo * 100)}%
                </span>
              </div>
            </Fila>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingesta</CardTitle>
            <IconHead>
              <DownloadCloud className="size-4" />
            </IconHead>
          </CardHeader>
          <CardBody>
            <Fila
              label="Máximo por fuente"
              hint="Cuántas notas nuevas trae cada fuente en cada corrida de ingesta (anti-flood)."
            >
              <input
                type="number"
                min={1}
                max={50}
                value={c.maxPorFuente}
                onChange={(e) => set("maxPorFuente", Math.max(1, +e.target.value))}
                className={cn(inputCls, num)}
              />
            </Fila>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retención</CardTitle>
            <IconHead>
              <Trash2 className="size-4" />
            </IconHead>
          </CardHeader>
          <CardBody>
            <Fila
              label="Días hasta la papelera"
              hint="Lo descartable (no archivado, sin publicar) va a la papelera tras estos días."
            >
              <input
                type="number"
                min={1}
                value={c.retencionDias}
                onChange={(e) => set("retencionDias", Math.max(1, +e.target.value))}
                className={cn(inputCls, num)}
              />
            </Fila>
            <Fila
              label="Días en la papelera"
              hint="Tras este tiempo en la papelera, se borra definitivamente."
            >
              <input
                type="number"
                min={1}
                value={c.papeleraDias}
                onChange={(e) => set("papeleraDias", Math.max(1, +e.target.value))}
                className={cn(inputCls, num)}
              />
            </Fila>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proveedores de IA</CardTitle>
            <IconHead>
              <KeyRound className="size-4" />
            </IconHead>
          </CardHeader>
          <CardBody>
            <Fila label="Claude (Anthropic)" hint="Calidad. Clave en el servidor.">
              <Badge tone={proveedores.claude ? "success" : "danger"}>
                {proveedores.claude ? "configurado" : "sin clave"}
              </Badge>
            </Fila>
            <Fila label="DeepSeek" hint="Volumen / respaldo. Clave en el servidor.">
              <Badge tone={proveedores.deepseek ? "success" : "danger"}>
                {proveedores.deepseek ? "configurado" : "sin clave"}
              </Badge>
            </Fila>
            <p className="border-t border-line/60 pt-4 text-xs text-muted">
              Las claves de IA se cargan en el servidor (archivo <code>.env</code>),
              no desde acá, por seguridad.
            </p>
          </CardBody>
        </Card>
      </div>

      <Toast message={message} />
    </div>
  );
}
