import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Columns2,
  DownloadCloud,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  Lightbulb,
  Link2,
  type LucideIcon,
  ChevronDown,
  Pencil,
  Rss,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

// El día del editor, en 3 pasos.
const FLUJO = [
  { icon: DownloadCloud, label: "Traer noticias" },
  { icon: CalendarPlus, label: "Programar" },
  { icon: Clock, label: "Sale sola a su hora" },
];

// Cómo programar una nota (la acción central del editor).
const PASOS: { titulo: string; desc: string }[] = [
  {
    titulo: "Traé las noticias",
    desc: "En Noticias tocá «Traer noticias» y elegí de qué categorías, sitios o fuentes traer. Las notas aparecen en el feed.",
  },
  {
    titulo: "Abrí «Programar»",
    desc: "En una noticia tocá «Programar». La IA reescribe la nota al instante y se abre a pantalla completa.",
  },
  {
    titulo: "Revisá y ajustá",
    desc: "En «Diff» ves original vs. reescrito; en «Editar» tocás el texto; con «Ver nota original» abrís la fuente. Elegí la imagen de portada.",
  },
  {
    titulo: "Reescribí si querés",
    desc: "Podés cambiar el tono o el proveedor de IA y tocar «Regenerar» para obtener otra versión, sin perder tu imagen ni tu selección.",
  },
  {
    titulo: "Elegí sitio, día y hora",
    desc: "Marcá el o los sitios de destino, el día y la hora, y tocá «Programar». La nota queda en el Calendario, lista para salir sola.",
  },
];

const SECCIONES: {
  icon: LucideIcon;
  titulo: string;
  desc: string;
  tip: string;
  href: string;
}[] = [
  {
    icon: Rss,
    titulo: "Noticias",
    desc: "Tu bandeja de trabajo. Traés lo último de las fuentes y, desde cada nota, la programás (o la descartás).",
    tip: "«Traer noticias» te deja elegir por categoría o sitio para no llenarte de temas que no publicás.",
    href: "/noticias",
  },
  {
    icon: CalendarDays,
    titulo: "Calendario",
    desc: "Dónde ves y organizás lo que sale, por horario y por sitio (cada color es un sitio). Las notas se publican solas a su hora.",
    tip: "Arrastrá un bloque para cambiarle la hora; clic para ver el detalle o publicar ya.",
    href: "/calendario",
  },
  {
    icon: LayoutDashboard,
    titulo: "Dashboard",
    desc: "El pulso del día: cuánto entró, cuánto está programado y cuánto salió, de un vistazo.",
    tip: "Es tu punto de partida cada mañana para saber cómo venís de contenido.",
    href: "/",
  },
  {
    icon: Link2,
    titulo: "Pegar URL",
    desc: "¿Viste una nota puntual que querés publicar? Pegás su link y entra al flujo como una noticia más.",
    tip: "Ideal para una exclusiva o algo que no está en tus fuentes.",
    href: "/pegar",
  },
  {
    icon: Images,
    titulo: "Multimedia",
    desc: "Banco de imágenes para usar de portada. Las buscás y reutilizás desde cualquier nota al programar.",
    tip: "Tagueá al subir (ej. «anses, economía») para encontrarlas rápido.",
    href: "/multimedia",
  },
  {
    icon: Trash2,
    titulo: "Papelera",
    desc: "Lo que descartaste. Nada se pierde de golpe: podés revisar antes de que se limpie.",
    tip: "Si descartaste algo por error, buscalo acá.",
    href: "/papelera",
  },
];

const RECOMENDACIONES = [
  "Confiá en la reescritura, pero mirá el «Diff» en las notas sensibles antes de programar.",
  "Balanceá el día: fijate que no se junten muchas notas del mismo tema seguidas (los colores por sitio te ayudan a verlo).",
  "Programá con tiempo: dejá el día armado y el calendario dispara todo solo, aunque no estés.",
  "Si una nota de calendario o lista trae info incompleta, usá «Re-extraer» o «Ver nota original» para completarla.",
  "¿Necesitás que salga ya, sin esperar la hora? En el detalle de la nota en el Calendario, tocá «Publicar ahora».",
];

const FAQ = [
  {
    q: "Programé notas y no las veo salir. ¿Tengo que hacer algo?",
    a: "No: salen solas a su hora (el despachador corre cada 2 minutos) y el calendario se refresca solo para mostrar el candado cuando se publicaron. Si querés forzar una salida inmediata, usá «Despachar ahora» arriba del calendario.",
  },
  {
    q: "«Traer noticias» me trae 0 noticias.",
    a: "Casi siempre es porque esas notas ya se trajeron antes (no se duplican). Probá traer de otra categoría o fuente. Y si una nota ya ingestada quedó incompleta, usala con «Re-extraer» en vez de volver a traerla.",
  },
  {
    q: "A una nota le falta información (por ejemplo un calendario de fechas).",
    a: "Algunas notas traen datos en listas o tablas que la extracción no capta del todo. Tocá «Re-extraer» en la tarjeta para volver a bajar el contenido, o usá «Ver nota original» dentro de Programar para completarlo a mano.",
  },
  {
    q: "No veo Fuentes, Destinos, Escenarios, Ajustes ni Usuarios.",
    a: "Son secciones de administración: las configura un administrador (qué fuentes, qué sitios, qué categorías publica cada sitio). Como editor te enfocás en el contenido: traer, programar y organizar el calendario.",
  },
  {
    q: "¿Puedo publicar la misma nota en varios sitios?",
    a: "Sí. Al programar, marcá todos los sitios de destino que quieras. Se agenda una salida por cada sitio; después las ves en el calendario con el color de cada uno.",
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
        subtitle="Cómo trabajar el día a día: traer noticias, programarlas y dejar que el calendario las publique solo."
      />

      {/* El día en 3 pasos */}
      <Card className="mb-8 p-5">
        <p className="mb-4 text-sm font-medium text-fg">Tu día, en 3 pasos</p>
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
          El editor no piensa en «aprobar notas»: piensa en{" "}
          <strong className="font-medium text-fg">qué publica hoy y a qué sitio va</strong>. Traés lo
          último de tus fuentes, elegís qué programar y el{" "}
          <strong className="font-medium text-fg">calendario lo dispara solo</strong> a la hora que
          pusiste, aunque no estés.
        </p>
      </Card>

      {/* Cómo programar una nota */}
      <h2 className="mb-4 font-display text-xl font-medium text-fg">Cómo programar una nota</h2>
      <Card className="mb-10">
        <CardBody className="space-y-4">
          {PASOS.map((p, i) => (
            <div key={p.titulo} className="flex items-start gap-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-fg">{p.titulo}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{p.desc}</p>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1">
              <Columns2 className="size-3.5" /> Diff = original vs. IA
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1">
              <Pencil className="size-3.5" /> Editar = ajustar el texto
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1">
              <ImageIcon className="size-3.5" /> Portada = imagen de la nota
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Las secciones que usás */}
      <h2 className="mb-4 font-display text-xl font-medium text-fg">Las secciones que usás</h2>
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

      {/* El calendario en detalle */}
      <h2 className="mb-4 font-display text-xl font-medium text-fg">Cómo funciona el calendario</h2>
      <Card className="mb-10">
        <CardBody className="space-y-3 text-sm text-fg">
          <p className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand" />
            Cada nota es un bloque con <strong className="mx-1 font-medium">color por sitio</strong>.
            Cambiás entre vista <strong className="mx-1 font-medium">Día / Semana / Mes</strong>.
          </p>
          <p className="flex items-start gap-2.5">
            <CalendarPlus className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              <strong className="font-medium">Arrastrá</strong> un bloque para cambiarle la hora, o
              hacé clic para ver el detalle, <strong className="font-medium">reprogramar</strong> o{" "}
              <strong className="font-medium">publicar ya</strong>.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              <strong className="font-medium">Se dispara solo:</strong> a su hora, la nota se publica
              sin que estés. Cuando sale, queda <strong className="font-medium">bloqueada con un
              candado</strong> y ya no se puede mover.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <Send className="mt-0.5 size-4 shrink-0 text-brand" />
            El <strong className="mx-1 font-medium">reloj</strong> (arriba a la derecha) te da la hora
            de un vistazo, y <strong className="mx-1 font-medium">«Despachar ahora»</strong> fuerza la
            salida de todo lo que ya venció.
          </p>
        </CardBody>
      </Card>

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
      <h2 className="mb-4 font-display text-xl font-medium text-fg">Preguntas frecuentes</h2>
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
        <Badge tone="brand">Regla de oro</Badge>
        <p className="text-sm text-muted">
          Programá el día con tiempo y{" "}
          <strong className="font-medium text-fg">dejá que el calendario trabaje por vos</strong>: sale
          todo solo, a la hora que pusiste.
        </p>
      </div>
    </div>
  );
}
