import { Badge } from "@scrapify/ui/badge";
import { Card, CardBody } from "@scrapify/ui/card";
import { PageHeader } from "@scrapify/ui/page-header";
import {
  AtSign,
  Clapperboard,
  ImagePlus,
  Send,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

const KPIS: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Users, label: "Clientes", value: "—" },
  { icon: AtSign, label: "Cuentas conectadas", value: "—" },
  { icon: Clapperboard, label: "Videos publicados", value: "—" },
  { icon: Send, label: "En cola", value: "—" },
];

const FLUJO: { icon: LucideIcon; label: string }[] = [
  { icon: Upload, label: "Subir video" },
  { icon: ImagePlus, label: "Logo + zócalo" },
  { icon: Clapperboard, label: "Render" },
  { icon: Send, label: "Publicar en redes" },
];

export default function PanelRedes() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Panel de Redes"
        subtitle="Estudio de video y publicación en redes sociales."
        action={<Badge tone="accent">En construcción</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <CardBody className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-elevated text-accent">
                <k.icon className="size-5" />
              </span>
              <div>
                <p className="font-mono text-2xl font-medium text-fg">{k.value}</p>
                <p className="text-xs text-muted">{k.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardBody>
          <p className="mb-5 text-sm font-medium text-fg">El flujo</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            {FLUJO.map((f, i) => (
              <span key={f.label} className="flex items-center gap-3">
                <span className="flex items-center gap-2 rounded-full border border-line bg-elevated/40 px-3 py-1.5 text-sm text-fg">
                  <f.icon className="size-4 text-accent" />
                  {f.label}
                </span>
                {i < FLUJO.length - 1 && (
                  <span className="text-muted" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted">
            Segundo panel funcionando, con el design system compartido. Próximo:
            conectar clientes y cuentas, y el estudio de render.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
