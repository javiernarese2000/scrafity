"use client";

import { Badge } from "@scrapify/ui/badge";
import { Toast, useToast } from "@scrapify/ui/toast";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ImagePlus,
  Send,
  Type,
  Upload,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { ClienteConCuentas, Plataforma } from "@/server/cuentas";

type Aspecto = "9:16" | "1:1" | "16:9";
type Esquina = "tl" | "tr" | "bl" | "br";
type ZocaloEstilo =
  | "barra"
  | "degradado"
  | "bloque"
  | "resaltado"
  | "caja"
  | "cinta"
  | "minimal";
type Fuente =
  | "display"
  | "sans"
  | "anton"
  | "bebas"
  | "oswald"
  | "archivo"
  | "inter"
  | "mono";
type PosicionZ = "abajo" | "centro" | "arriba";
type Alineacion = "left" | "center" | "right";

const ASPECTOS: { id: Aspecto; res: string; frame: string }[] = [
  { id: "9:16", res: "1080×1920", frame: "h-full aspect-[9/16] max-w-full" },
  { id: "1:1", res: "1080×1080", frame: "h-full aspect-square max-w-full" },
  { id: "16:9", res: "1920×1080", frame: "w-full aspect-video max-h-full" },
];

const FUENTES: { id: Fuente; label: string; varName: string }[] = [
  { id: "display", label: "Serif", varName: "var(--font-display)" },
  { id: "sans", label: "Sans", varName: "var(--font-sans)" },
  { id: "anton", label: "Anton", varName: "var(--font-anton)" },
  { id: "bebas", label: "Bebas", varName: "var(--font-bebas)" },
  { id: "oswald", label: "Oswald", varName: "var(--font-oswald)" },
  { id: "archivo", label: "Archivo", varName: "var(--font-archivo)" },
  { id: "inter", label: "Inter", varName: "var(--font-inter)" },
  { id: "mono", label: "Mono", varName: "var(--font-mono)" },
];

const ESTILOS: { id: ZocaloEstilo; label: string }[] = [
  { id: "barra", label: "Barra" },
  { id: "degradado", label: "Degradado" },
  { id: "bloque", label: "Bloque" },
  { id: "resaltado", label: "Resaltado" },
  { id: "caja", label: "Caja" },
  { id: "cinta", label: "Cinta" },
  { id: "minimal", label: "Minimal" },
];

const POSICIONES_Z: { id: PosicionZ; label: string }[] = [
  { id: "abajo", label: "Abajo" },
  { id: "centro", label: "Centro" },
  { id: "arriba", label: "Arriba" },
];

const ALINEACIONES: { id: Alineacion; icon: LucideIcon }[] = [
  { id: "left", icon: AlignLeft },
  { id: "center", icon: AlignCenter },
  { id: "right", icon: AlignRight },
];

const POSICIONES: { id: Esquina; label: string }[] = [
  { id: "tl", label: "↖" },
  { id: "tr", label: "↗" },
  { id: "bl", label: "↙" },
  { id: "br", label: "↘" },
];

const COLOR_PLAT: Record<Plataforma, string> = {
  instagram: "#d6336c",
  facebook: "#3b5998",
  tiktok: "#0ea5b7",
};

function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function Group({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="size-3.5 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function EstudioBoard({ clientes }: { clientes: ClienteConCuentas[] }) {
  const { message, show } = useToast();
  const videoInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const [aspecto, setAspecto] = useState<Aspecto>("9:16");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPos, setLogoPos] = useState<Esquina>("tr");
  const [logoSize, setLogoSize] = useState(24);
  const [logoOpacidad, setLogoOpacidad] = useState(100);

  const [zocaloOn, setZocaloOn] = useState(true);
  const [estilo, setEstilo] = useState<ZocaloEstilo>("barra");
  const [texto, setTexto] = useState("Tu titular o zócalo acá");
  const [fuente, setFuente] = useState<Fuente>("display");
  const [fontSize, setFontSize] = useState(22);
  const [colorTexto, setColorTexto] = useState("#ffffff");
  const [colorBarra, setColorBarra] = useState("#111111");
  const [opacidad, setOpacidad] = useState(0.55);
  const [posicion, setPosicion] = useState<PosicionZ>("abajo");
  const [alineacion, setAlineacion] = useState<Alineacion>("left");
  const [padding, setPadding] = useState(16);
  const [mayus, setMayus] = useState(false);

  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [destinos, setDestinos] = useState<Set<string>>(new Set());

  const cliente = clientes.find((c) => c.id === clienteId);
  const asp = ASPECTOS.find((a) => a.id === aspecto)!;
  const fontVar = FUENTES.find((f) => f.id === fuente)!.varName;

  const posCls: Record<Esquina, string> = {
    tl: "top-[4%] left-[4%]",
    tr: "top-[4%] right-[4%]",
    bl: "bottom-[4%] left-[4%]",
    br: "bottom-[4%] right-[4%]",
  };

  function cargarVideo(file?: File | null) {
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
  }
  function cargarLogo(file?: File | null) {
    if (!file) return;
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    setLogoUrl(URL.createObjectURL(file));
  }
  function toggleDestino(id: string) {
    setDestinos((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function enviarRender() {
    if (!videoUrl) return show("Subí un video primero");
    show("Render y publicación se conectan en la etapa final");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <Video className="size-5 text-accent" />
        <span className="font-display text-lg font-medium text-fg">Estudio</span>

        <div className="ml-4 flex items-center gap-1 rounded-lg border border-line p-0.5">
          {ASPECTOS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAspecto(a.id)}
              className={
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                (aspecto === a.id
                  ? "bg-elevated text-fg"
                  : "text-muted hover:text-fg")
              }
            >
              {a.id}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={enviarRender}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-brand-foreground transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Send className="size-4" />
          Enviar a render
          {destinos.size > 0 && <Badge tone="brand">{destinos.size}</Badge>}
        </button>
      </div>

      {/* Cuerpo: 3 paneles */}
      <div className="flex flex-1 overflow-hidden">
        {/* Rail izquierdo: media */}
        <aside className="hidden w-[280px] shrink-0 space-y-5 overflow-y-auto border-r border-line p-4 md:block">
          <Group icon={Video} title="Video">
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => cargarVideo(e.target.files?.[0])}
            />
            {videoUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-elevated text-accent">
                  <Video className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-fg">
                  {videoName}
                </span>
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-3 py-6 text-muted transition-colors hover:border-accent hover:text-fg"
              >
                <Upload className="size-5" />
                <span className="text-xs">Subir o arrastrar video</span>
              </button>
            )}
          </Group>

          <Group icon={ImagePlus} title="Logo">
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              hidden
              onChange={(e) => cargarLogo(e.target.files?.[0])}
            />
            {logoUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="logo"
                    className="size-8 shrink-0 rounded-md object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(logoUrl);
                      setLogoUrl(null);
                    }}
                    className="ml-auto grid size-7 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-muted">Posición</p>
                  <div className="grid w-[76px] grid-cols-2 gap-1.5">
                    {POSICIONES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLogoPos(p.id)}
                        className={
                          "grid size-8 place-items-center rounded-md border text-sm transition-colors " +
                          (logoPos === p.id
                            ? "border-accent bg-accent/10 text-fg"
                            : "border-line text-muted hover:bg-elevated")
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Slider
                  label={`Tamaño · ${logoSize}%`}
                  min={10}
                  max={50}
                  value={logoSize}
                  onChange={setLogoSize}
                />
                <Slider
                  label={`Opacidad · ${logoOpacidad}%`}
                  min={20}
                  max={100}
                  value={logoOpacidad}
                  onChange={setLogoOpacidad}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-3 py-5 text-muted transition-colors hover:border-accent hover:text-fg"
              >
                <Upload className="size-5" />
                <span className="text-xs">Subir logo (PNG)</span>
              </button>
            )}
          </Group>
        </aside>

        {/* Escenario central */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#0c0b09] p-6">
          <span className="absolute left-4 top-4 z-10 rounded-md bg-white/10 px-2 py-1 font-mono text-[11px] text-white/70 backdrop-blur-sm">
            {aspecto} · {asp.res}
          </span>
          <span className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            En vivo
          </span>

          <div
            className={
              "relative overflow-hidden rounded-[1.4rem] bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/10 " +
              asp.frame
            }
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              cargarVideo(e.dataTransfer.files?.[0]);
            }}
          >
            {videoUrl ? (
              <video
                src={videoUrl}
                className="absolute inset-0 size-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <button
                type="button"
                onClick={() => videoInput.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60"
              >
                <Upload className="size-8" />
                <span className="text-sm">Arrastrá un video acá</span>
                <span className="text-xs text-white/30">o hacé clic</span>
              </button>
            )}

            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="logo"
                className={"absolute " + posCls[logoPos]}
                style={{ width: `${logoSize}%`, opacity: logoOpacidad / 100 }}
              />
            )}

            {zocaloOn && texto && (
              <Zocalo
                estilo={estilo}
                texto={texto}
                fontVar={fontVar}
                fontSize={fontSize}
                colorTexto={colorTexto}
                colorBarra={colorBarra}
                opacidad={opacidad}
                padding={padding}
                alineacion={alineacion}
                uppercase={mayus}
                posicion={posicion}
              />
            )}
          </div>
        </div>

        {/* Rail derecho: inspector */}
        <aside className="w-[300px] shrink-0 space-y-5 overflow-y-auto border-l border-line p-4">
          <Group icon={Type} title="Zócalo">
            <label className="mb-3 flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={zocaloOn}
                onChange={(e) => setZocaloOn(e.target.checked)}
                className="size-4 accent-[var(--color-accent)]"
              />
              Mostrar zócalo
            </label>

            {zocaloOn && (
              <div className="space-y-3">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={2}
                  placeholder="Texto del zócalo…"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                />

                <div className="grid grid-cols-4 gap-1.5">
                  {ESTILOS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEstilo(s.id)}
                      className={
                        "rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors " +
                        (estilo === s.id
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-line text-muted hover:bg-elevated")
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {FUENTES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFuente(f.id)}
                      style={{ fontFamily: f.varName }}
                      className={
                        "rounded-md border px-1 py-1.5 text-sm transition-colors " +
                        (fuente === f.id
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-line text-muted hover:bg-elevated")
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <Slider
                  label={`Tamaño de texto · ${fontSize}`}
                  min={12}
                  max={40}
                  value={fontSize}
                  onChange={setFontSize}
                />

                <div className="flex items-center gap-4">
                  <ColorField label="Texto" value={colorTexto} onChange={setColorTexto} />
                  <ColorField label="Barra" value={colorBarra} onChange={setColorBarra} />
                </div>

                <Slider
                  label={`Opacidad barra · ${Math.round(opacidad * 100)}%`}
                  min={0}
                  max={100}
                  value={Math.round(opacidad * 100)}
                  onChange={(v) => setOpacidad(v / 100)}
                />

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="mb-1.5 text-xs text-muted">Posición</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {POSICIONES_Z.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPosicion(p.id)}
                          className={
                            "rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors " +
                            (posicion === p.id
                              ? "border-accent bg-accent/10 text-fg"
                              : "border-line text-muted hover:bg-elevated")
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs text-muted">Alineación</p>
                    <div className="flex gap-1.5">
                      {ALINEACIONES.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setAlineacion(a.id)}
                          className={
                            "grid size-8 place-items-center rounded-md border transition-colors " +
                            (alineacion === a.id
                              ? "border-accent bg-accent/10 text-fg"
                              : "border-line text-muted hover:bg-elevated")
                          }
                        >
                          <a.icon className="size-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Slider
                  label={`Padding · ${padding}px`}
                  min={0}
                  max={48}
                  value={padding}
                  onChange={setPadding}
                />

                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    checked={mayus}
                    onChange={(e) => setMayus(e.target.checked)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  MAYÚSCULAS
                </label>
              </div>
            )}
          </Group>

          <div className="h-px bg-line" />

          <Group icon={Send} title="Destino">
            {clientes.length === 0 ? (
              <p className="text-xs text-muted">
                Creá un cliente y conectale cuentas para elegir destino.
              </p>
            ) : (
              <div className="space-y-3">
                <select
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setDestinos(new Set());
                  }}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>

                {cliente && cliente.cuentas.length === 0 ? (
                  <p className="text-xs text-muted">
                    Este cliente no tiene cuentas. Agregalas en Cuentas.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cliente?.cuentas.map((a) => {
                      const sel = destinos.has(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleDestino(a.id)}
                          className={
                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                            (sel
                              ? "border-accent bg-accent/10 text-fg"
                              : "border-line text-muted hover:bg-elevated")
                          }
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: COLOR_PLAT[a.plataforma] }}
                          />
                          @{a.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Group>
        </aside>
      </div>

      <Toast message={message} />
    </div>
  );
}

function Zocalo({
  estilo,
  texto,
  fontVar,
  fontSize,
  colorTexto,
  colorBarra,
  opacidad,
  padding,
  alineacion,
  uppercase,
  posicion,
}: {
  estilo: ZocaloEstilo;
  texto: string;
  fontVar: string;
  fontSize: number;
  colorTexto: string;
  colorBarra: string;
  opacidad: number;
  padding: number;
  alineacion: Alineacion;
  uppercase: boolean;
  posicion: PosicionZ;
}) {
  const baseText = {
    fontFamily: fontVar,
    fontSize: `${fontSize}px`,
    color: colorTexto,
    lineHeight: 1.18,
    textAlign: alineacion,
    textTransform: uppercase ? "uppercase" : "none",
  } as CSSProperties;
  const pad = `${padding}px`;
  const wrap =
    posicion === "arriba"
      ? "top-0"
      : posicion === "centro"
        ? "top-1/2 -translate-y-1/2"
        : "bottom-0";
  const justify =
    alineacion === "center"
      ? "center"
      : alineacion === "right"
        ? "flex-end"
        : "flex-start";

  if (estilo === "degradado") {
    const dir = posicion === "arriba" ? "to bottom" : "to top";
    return (
      <div
        className={"absolute inset-x-0 flex " + wrap}
        style={{
          height: "44%",
          padding: pad,
          alignItems: posicion === "arriba" ? "flex-start" : "flex-end",
          background: `linear-gradient(${dir}, ${rgba(colorBarra, Math.max(opacidad, 0.6))}, transparent)`,
        }}
      >
        <p style={{ ...baseText, width: "100%" }} className="font-medium">
          {texto}
        </p>
      </div>
    );
  }

  if (estilo === "bloque") {
    return (
      <div
        className={"absolute inset-x-0 flex " + wrap}
        style={{ padding: pad, justifyContent: justify }}
      >
        <span
          className="rounded-lg font-medium"
          style={{
            ...baseText,
            backgroundColor: rgba(colorBarra, opacidad),
            padding: `${Math.round(padding * 0.45)}px ${Math.max(padding, 10)}px`,
          }}
        >
          {texto}
        </span>
      </div>
    );
  }

  if (estilo === "resaltado") {
    return (
      <div className={"absolute inset-x-0 " + wrap} style={{ padding: pad }}>
        <p style={baseText} className="font-semibold leading-relaxed">
          <span
            style={{
              backgroundColor: rgba(colorBarra, opacidad),
              padding: "0.08em 0.3em",
              WebkitBoxDecorationBreak: "clone",
              boxDecorationBreak: "clone",
            }}
          >
            {texto}
          </span>
        </p>
      </div>
    );
  }

  if (estilo === "caja") {
    return (
      <div className={"absolute inset-x-0 " + wrap} style={{ padding: pad }}>
        <div
          className="rounded-lg border-2"
          style={{
            borderColor: rgba(colorTexto, 0.9),
            backgroundColor: rgba(colorBarra, opacidad),
            padding: pad,
          }}
        >
          <p style={baseText} className="font-medium">
            {texto}
          </p>
        </div>
      </div>
    );
  }

  if (estilo === "cinta") {
    return (
      <div className={"absolute inset-x-0 " + wrap} style={{ padding: pad }}>
        <div
          style={{
            backgroundColor: rgba(colorBarra, opacidad),
            borderLeft: "4px solid var(--color-accent)",
            padding: pad,
          }}
        >
          <p style={baseText} className="font-medium">
            {texto}
          </p>
        </div>
      </div>
    );
  }

  if (estilo === "minimal") {
    return (
      <div className={"absolute inset-x-0 " + wrap} style={{ padding: pad }}>
        <span
          className="mb-1.5 block h-[3px] w-8 rounded-full bg-[var(--color-accent)]"
          style={{
            marginLeft: alineacion === "left" ? 0 : "auto",
            marginRight: alineacion === "right" ? 0 : alineacion === "center" ? "auto" : undefined,
          }}
        />
        <p
          style={{ ...baseText, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}
          className="font-medium"
        >
          {texto}
        </p>
      </div>
    );
  }

  // barra (default)
  return (
    <div
      className={"absolute inset-x-0 " + wrap}
      style={{ backgroundColor: rgba(colorBarra, opacidad), padding: pad }}
    >
      <p style={baseText} className="font-medium">
        {texto}
      </p>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 cursor-pointer rounded border border-line bg-transparent"
      />
      {label}
    </label>
  );
}
