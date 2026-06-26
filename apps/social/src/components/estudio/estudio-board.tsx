"use client";

import { Badge } from "@scrapify/ui/badge";
import { Button } from "@scrapify/ui/button";
import { Toast, useToast } from "@scrapify/ui/toast";
import {
  Clapperboard,
  ImagePlus,
  Send,
  Type,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import type { ClienteConCuentas, Plataforma } from "@/server/cuentas";

type Aspecto = "9:16" | "1:1" | "16:9";
type Esquina = "tl" | "tr" | "bl" | "br";
type ZocaloEstilo = "barra" | "degradado" | "bloque" | "minimal";
type Fuente = "display" | "sans" | "mono";

const ASPECTOS: { id: Aspecto; label: string; cls: string }[] = [
  { id: "9:16", label: "9:16 · Reels/TikTok", cls: "aspect-[9/16]" },
  { id: "1:1", label: "1:1 · Feed", cls: "aspect-square" },
  { id: "16:9", label: "16:9 · YouTube", cls: "aspect-video" },
];

const FUENTES: { id: Fuente; label: string; varName: string }[] = [
  { id: "display", label: "Serif", varName: "var(--font-display)" },
  { id: "sans", label: "Sans", varName: "var(--font-sans)" },
  { id: "mono", label: "Mono", varName: "var(--font-mono)" },
];

const ESTILOS: { id: ZocaloEstilo; label: string }[] = [
  { id: "barra", label: "Barra" },
  { id: "degradado", label: "Degradado" },
  { id: "bloque", label: "Bloque" },
  { id: "minimal", label: "Minimal" },
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
  tiktok: "#111111",
};

function Seccion({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Video;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-line/70 bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-accent" />
        <h3 className="text-sm font-medium text-fg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
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
  const [logoSize, setLogoSize] = useState(24); // % del ancho

  const [zocaloOn, setZocaloOn] = useState(true);
  const [estilo, setEstilo] = useState<ZocaloEstilo>("barra");
  const [texto, setTexto] = useState("Tu titular o zócalo acá");
  const [fuente, setFuente] = useState<Fuente>("display");
  const [fontSize, setFontSize] = useState(22);
  const [colorTexto, setColorTexto] = useState("#ffffff");
  const [colorBarra, setColorBarra] = useState("#111111");
  const [opacidad, setOpacidad] = useState(0.55);

  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [destinos, setDestinos] = useState<Set<string>>(new Set());

  const cliente = clientes.find((c) => c.id === clienteId);

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

  const fontVar = FUENTES.find((f) => f.id === fuente)!.varName;
  const aspectoCls = ASPECTOS.find((a) => a.id === aspecto)!.cls;

  const posCls: Record<Esquina, string> = {
    tl: "top-[4%] left-[4%]",
    tr: "top-[4%] right-[4%]",
    bl: "bottom-[4%] left-[4%]",
    br: "bottom-[4%] right-[4%]",
  };

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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[2rem] font-medium tracking-tight text-fg">
            Estudio
          </h2>
          <p className="mt-1 text-sm text-muted">
            Subí un video, ponele tu logo y zócalo, y mandalo a tus redes.
          </p>
        </div>
        <Button onClick={enviarRender}>
          <Send className="size-4" />
          Enviar a render
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- PREVIEW EN VIVO ---------- */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-line/70 bg-elevated/40 p-6">
            <div className="mb-3 flex items-center gap-2 self-start">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                Preview en vivo
              </span>
            </div>

            <div
              className={
                "relative w-full max-w-[340px] overflow-hidden rounded-[1.6rem] border-4 border-[#0c0b09] bg-black shadow-float " +
                aspectoCls
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
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70"
                >
                  <Upload className="size-7" />
                  <span className="text-sm">Arrastrá un video</span>
                  <span className="text-xs text-white/40">o hacé clic</span>
                </button>
              )}

              {/* Logo */}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="logo"
                  className={"absolute " + posCls[logoPos]}
                  style={{ width: `${logoSize}%` }}
                />
              )}

              {/* Zócalo */}
              {zocaloOn && texto && (
                <Zocalo
                  estilo={estilo}
                  texto={texto}
                  fontVar={fontVar}
                  fontSize={fontSize}
                  colorTexto={colorTexto}
                  colorBarra={colorBarra}
                  opacidad={opacidad}
                />
              )}
            </div>

            {videoName && (
              <p className="mt-3 max-w-[340px] truncate text-xs text-muted">
                {videoName}
              </p>
            )}
          </div>
        </div>

        {/* ---------- CONTROLES ---------- */}
        <div className="space-y-4">
          {/* Formato */}
          <Seccion icon={Clapperboard} title="Formato">
            <div className="grid grid-cols-3 gap-2">
              {ASPECTOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspecto(a.id)}
                  className={
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors " +
                    (aspecto === a.id
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-line text-muted hover:bg-elevated")
                  }
                >
                  {a.id}
                </button>
              ))}
            </div>
          </Seccion>

          {/* Video */}
          <Seccion icon={Video} title="Video">
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => cargarVideo(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => videoInput.current?.click()}
            >
              <Upload className="size-4" />
              {videoUrl ? "Cambiar video" : "Subir video"}
            </Button>
          </Seccion>

          {/* Logo */}
          <Seccion icon={ImagePlus} title="Logo">
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/webp,image/svg+xml,image/jpeg"
              hidden
              onChange={(e) => cargarLogo(e.target.files?.[0])}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoInput.current?.click()}
              >
                <Upload className="size-3.5" />
                {logoUrl ? "Cambiar" : "Subir"}
              </Button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(logoUrl);
                    setLogoUrl(null);
                  }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger"
                >
                  <X className="size-3.5" />
                  Quitar
                </button>
              )}
            </div>

            {logoUrl && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-xs text-muted">Posición</p>
                  <div className="grid w-20 grid-cols-2 gap-1.5">
                    {POSICIONES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLogoPos(p.id)}
                        className={
                          "grid size-9 place-items-center rounded-md border text-sm transition-colors " +
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
              </div>
            )}
          </Seccion>

          {/* Zócalo */}
          <Seccion icon={Type} title="Zócalo">
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

                <div>
                  <p className="mb-1.5 text-xs text-muted">Estilo</p>
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
                </div>

                <div>
                  <p className="mb-1.5 text-xs text-muted">Tipografía</p>
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
              </div>
            )}
          </Seccion>

          {/* Destino */}
          <Seccion icon={Send} title="Destino">
            {clientes.length === 0 ? (
              <p className="text-sm text-muted">
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
                  <div className="flex flex-wrap gap-2">
                    {cliente?.cuentas.map((a) => {
                      const sel = destinos.has(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleDestino(a.id)}
                          className={
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
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
          </Seccion>

          <Button className="w-full" onClick={enviarRender}>
            <Send className="size-4" />
            Enviar a render
            {destinos.size > 0 && (
              <Badge tone="brand">{destinos.size}</Badge>
            )}
          </Button>
        </div>
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
}: {
  estilo: ZocaloEstilo;
  texto: string;
  fontVar: string;
  fontSize: number;
  colorTexto: string;
  colorBarra: string;
  opacidad: number;
}) {
  const baseText = {
    fontFamily: fontVar,
    fontSize: `${fontSize}px`,
    color: colorTexto,
    lineHeight: 1.15,
  } as const;

  if (estilo === "degradado") {
    return (
      <div
        className="absolute inset-x-0 bottom-0 flex items-end p-4"
        style={{
          height: "42%",
          background: `linear-gradient(to top, ${rgba(colorBarra, Math.max(opacidad, 0.6))}, transparent)`,
        }}
      >
        <p style={baseText} className="font-medium">
          {texto}
        </p>
      </div>
    );
  }

  if (estilo === "bloque") {
    return (
      <div className="absolute inset-x-0 bottom-0 p-4">
        <span
          className="inline-block rounded-lg px-3 py-1.5 font-medium"
          style={{ ...baseText, backgroundColor: rgba(colorBarra, opacidad) }}
        >
          {texto}
        </span>
      </div>
    );
  }

  if (estilo === "minimal") {
    return (
      <div className="absolute inset-x-0 bottom-0 p-4">
        <span className="mb-1.5 block h-[3px] w-8 rounded-full bg-[var(--color-accent)]" />
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
      className="absolute inset-x-0 bottom-0 px-4 py-3"
      style={{ backgroundColor: rgba(colorBarra, opacidad) }}
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
