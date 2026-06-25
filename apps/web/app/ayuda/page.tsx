import {
  ChevronDown,
  Images,
  Inbox,
  type LucideIcon,
  Lightbulb,
  Library,
  Newspaper,
  Radio,
  Send,
  SendHorizontal,
  Settings,
  Sparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const FLUJO = [
  { icon: Radio, label: "Fuentes" },
  { icon: Inbox, label: "Bandeja de entrada" },
  { icon: Sparkles, label: "IA genera" },
  { icon: Newspaper, label: "Moderación" },
  { icon: SendHorizontal, label: "Bandeja de salida" },
  { icon: Send, label: "WordPress / Feed" },
];

const SECCIONES: {
  icon: LucideIcon;
  titulo: string;
  desc: string;
  tip: string;
  href: string;
}[] = [
  {
    icon: Radio,
    titulo: "Fuentes",
    desc: "Feeds RSS de los medios. La ingesta lee las fuentes activas, deduplica y trae las notas en crudo.",
    tip: "Conectá cada fuente a un escenario en el canvas, si no, no ingiere nada.",
    href: "/fuentes",
  },
  {
    icon: Inbox,
    titulo: "Bandeja de entrada",
    desc: "Las notas ingestadas llegan acá en crudo. Aprobás las que querés (recién ahí la IA genera) y descartás el resto.",
    tip: "Es un filtro barato: descartá la basura antes de gastar tokens de IA.",
    href: "/curaduria",
  },
  {
    icon: Newspaper,
    titulo: "Moderación",
    desc: "Las versiones que la IA generó esperan tu revisión. Editás, regenerás, elegís versión y publicás o enviás a la cola.",
    tip: "Solo llegan acá las notas de escenarios con «moderación = ON».",
    href: "/moderacion",
  },
  {
    icon: SendHorizontal,
    titulo: "Bandeja de salida",
    desc: "La cola de despacho por destino. Arrastrás notas entre categorías y a «Prioritarias», y el despachador las suelta con el ritmo que configures.",
    tip: "Configurá el ritmo (ej. 2 cada 60 min) y prendé «Auto-despacho».",
    href: "/bandeja",
  },
  {
    icon: Library,
    titulo: "Biblioteca",
    desc: "La casa de toda nota: todas las versiones y estados. Editás, regenerás, cambiás la portada y publicás o republicás.",
    tip: "¿No encontrás una nota? Siempre está acá, sin importar su estado.",
    href: "/biblioteca",
  },
  {
    icon: Workflow,
    titulo: "Escenarios",
    desc: "El grafo Fuentes → Escenario → Destinos. Definís N versiones, tono, proveedor, cupo y el switch «moderación».",
    tip: "«Moderación = OFF» = la nota va sola a la Bandeja de salida (igual pasa por tu control ahí).",
    href: "/escenarios",
  },
  {
    icon: Send,
    titulo: "Destinos",
    desc: "WordPress de clientes (push por REST con contraseñas de aplicación) y sitios propios (pull por feed público).",
    tip: "En el WP del cliente usá un usuario Editor/Administrador y HTTPS en producción.",
    href: "/destinos",
  },
  {
    icon: Images,
    titulo: "Multimedia",
    desc: "Biblioteca global de imágenes con tags. Las reutilizás como portada desde cualquier nota con un buscador.",
    tip: "Tagueá al subir (ej. «messi, deportes») para encontrarlas rápido después.",
    href: "/multimedia",
  },
  {
    icon: Settings,
    titulo: "Ajustes",
    desc: "Configuración global que afecta de verdad: similitud objetivo, máximo por fuente, retención y estado de las claves de IA.",
    tip: "Bajá la «similitud objetivo» si querés notas menos parecidas al original.",
    href: "/ajustes",
  },
];

const RECOMENDACIONES = [
  "Conectá cada fuente a un escenario; si no, sus notas se saltean en la ingesta.",
  "Usá keywords en las conexiones del canvas para filtrar por tema (ej. solo fútbol de un medio deportivo).",
  "Moderación = ON para control total; OFF para automático (igual pasa por la Bandeja de salida antes de publicarse).",
  "Nada se publica sin pasar por la Bandeja de salida: es tu tablero de control de lo que sale.",
  "Si una nota quedó muy parecida al original, abrila en Biblioteca y tocá «Regenerar».",
  "Cargá la API key de DeepSeek para tener respaldo de IA y más volumen.",
];

const FAQ = [
  {
    q: "Aprobé una nota y no aparece en Moderación. ¿Dónde está?",
    a: "Si el escenario tiene «moderación = OFF», la nota va directo a la Bandeja de salida (no a Moderación). Y siempre, en cualquier estado, la encontrás en Biblioteca.",
  },
  {
    q: "La ingesta trae pocas notas. ¿Por qué?",
    a: "Tres motivos habituales: la fuente no está conectada a ningún escenario, el cupo diario del escenario ya se llenó, o son URLs ya ingestadas (dedup). Los cupos se reinician a medianoche.",
  },
  {
    q: "La similitud me da alta (50%+).",
    a: "Suele ser por citas textuales y datos que no se pueden cambiar. Igual podés bajar el objetivo en Ajustes y usar «Regenerar» en la nota; reintenta hasta acercarse al umbral.",
  },
  {
    q: "Veo categorías duplicadas en la Bandeja de salida.",
    a: "Las columnas son las categorías reales de tu WordPress. Si hay duplicados por plural u ortografía, limpialos en WordPress (Entradas → Categorías) y tocá «Refrescar categorías».",
  },
  {
    q: "No se publica solo. ¿Tengo que hacer algo?",
    a: "El despacho/ingesta automáticos corren con el servicio Inngest. Sin eso, funcionan con los botones manuales o con el «Auto-despacho» mientras tengas la Bandeja abierta.",
  },
];

function Flecha() {
  return (
    <span className="hidden text-muted sm:inline" aria-hidden="true">
      →
    </span>
  );
}

export default function AyudaPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Ayuda"
        subtitle="Cómo funciona Scrapify de punta a punta, qué hace cada sección y recomendaciones."
      />

      {/* El recorrido */}
      <Card className="mb-8 p-5">
        <p className="mb-4 text-sm font-medium text-fg">El recorrido</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          {FLUJO.map((f, i) => (
            <span key={f.label} className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-line bg-elevated/40 px-3 py-1.5 text-sm text-fg">
                <f.icon className="size-4 text-brand" />
                {f.label}
              </span>
              {i < FLUJO.length - 1 && <Flecha />}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Cada nota cruda pasa por <strong className="font-medium text-fg">dos controles humanos</strong>:
          la <strong className="font-medium text-fg">Bandeja de entrada</strong> (aprobás antes de
          gastar IA) y la <strong className="font-medium text-fg">Bandeja de salida</strong> (la ves
          antes de que se publique). Si el escenario pide moderación, además pasa por{" "}
          <strong className="font-medium text-fg">Moderación</strong>.
        </p>
      </Card>

      {/* Las secciones */}
      <h2 className="mb-4 font-display text-xl font-medium text-fg">Las secciones</h2>
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {SECCIONES.map((s) => (
          <Link key={s.titulo} href={s.href}>
            <Card className="h-full p-5 transition-shadow hover:shadow-float">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-elevated text-brand">
                  <s.icon className="size-4" />
                </span>
                <span className="font-medium text-fg">{s.titulo}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted">{s.desc}</p>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-accent">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
                {s.tip}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recomendaciones */}
      <h2 className="mb-4 font-display text-xl font-medium text-fg">Recomendaciones</h2>
      <Card className="mb-10">
        <CardBody className="space-y-3">
          {RECOMENDACIONES.map((r) => (
            <p key={r} className="flex items-start gap-2.5 text-sm text-fg">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              {r}
            </p>
          ))}
        </CardBody>
      </Card>

      {/* FAQ */}
      <h2 className="mb-4 font-display text-xl font-medium text-fg">
        Preguntas frecuentes
      </h2>
      <div className="space-y-2.5">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group rounded-[var(--radius-lg)] border border-line/70 bg-surface px-5 py-4 shadow-soft"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-fg">
              {item.q}
              <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-2">
        <Badge tone="brand">Tip</Badge>
        <p className="text-sm text-muted">
          Si te perdés, recordá la regla de oro: <strong className="font-medium text-fg">toda
          nota está en Biblioteca</strong>, pase lo que pase.
        </p>
      </div>
    </div>
  );
}
