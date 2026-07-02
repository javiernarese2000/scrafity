"use client";

import { Toast, useToast } from "@scrapify/ui/toast";
import {
  CheckCircle2,
  Clock,
  Film,
  Send,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import { EmojiPicker } from "@/components/componer/emoji-picker";
import { PhonePreview } from "@/components/componer/phone-preview";
import { RedIcon } from "@/components/icons/redes";
import type { ClienteConCuentas, Plataforma } from "@/server/cuentas";
import { publicarRender, type RenderRow } from "@/server/render";

const PLATS: { id: Plataforma; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Reel" },
  { id: "facebook", label: "Feed" },
];

/** Límite de caracteres del caption por red (el efectivo es el más chico). */
const LIMITES: Record<Plataforma, number> = {
  instagram: 2200,
  tiktok: 2200,
  facebook: 5000,
};

function defaultProgramada() {
  const d = new Date(Date.now() + 15 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "27 jun, 14:30" */
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDur(s: number | null) {
  if (!s) return null;
  return s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function ComponerBoard({
  clientes,
  renders,
}: {
  clientes: ClienteConCuentas[];
  renders: RenderRow[];
}) {
  const { message, show } = useToast();

  // Render (video) elegido como fuente de la publicación.
  const [renderId, setRenderId] = useState<string | null>(renders[0]?.id ?? null);
  const render = useMemo(
    () => renders.find((r) => r.id === renderId) ?? null,
    [renders, renderId],
  );

  // Cliente: si el render trae uno, manda; si no, se elige.
  const [clienteIdManual, setClienteIdManual] = useState<string>(
    clientes[0]?.id ?? "",
  );
  const clienteId = render?.clienteId ?? clienteIdManual;
  const cliente = useMemo(
    () => clientes.find((c) => c.id === clienteId),
    [clientes, clienteId],
  );
  const cuentas = cliente?.cuentas ?? [];

  const [sel, setSel] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [previewPlat, setPreviewPlat] = useState<Plataforma>("tiktok");
  const [modo, setModo] = useState<"ahora" | "programar">("ahora");
  const [programada, setProgramada] = useState(defaultProgramada);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const captionRef = useRef<HTMLTextAreaElement>(null);

  function elegirRender(id: string) {
    setRenderId(id);
    setSel(new Set());
    setError(null);
  }

  function toggleCuenta(c: { id: string; plataforma: Plataforma }) {
    setSel((prev) => {
      const next = new Set(prev);
      next.has(c.id) ? next.delete(c.id) : next.add(c.id);
      return next;
    });
    setPreviewPlat(c.plataforma);
  }

  function insertarEmoji(emoji: string) {
    const el = captionRef.current;
    if (!el) {
      setCaption((c) => c + emoji);
      return;
    }
    const start = el.selectionStart ?? caption.length;
    const end = el.selectionEnd ?? caption.length;
    const next = caption.slice(0, start) + emoji + caption.slice(end);
    setCaption(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  // Límite efectivo = el más chico entre las redes seleccionadas.
  const plataformasSel = useMemo(
    () =>
      cuentas
        .filter((c) => sel.has(c.id))
        .map((c) => c.plataforma),
    [cuentas, sel],
  );
  const limite = plataformasSel.length
    ? Math.min(...plataformasSel.map((p) => LIMITES[p]))
    : 2200;
  const excedido = caption.length > limite;

  // Identidad para el preview: cuenta seleccionada de la red previsualizada,
  // si no hay, primera de esa red, si no, el nombre del cliente.
  const handlePreview = useMemo(() => {
    const elegidaDeEsaRed = cuentas.find(
      (c) => sel.has(c.id) && c.plataforma === previewPlat,
    );
    const cualquieraDeEsaRed = cuentas.find((c) => c.plataforma === previewPlat);
    return (
      elegidaDeEsaRed?.nombre ??
      cualquieraDeEsaRed?.nombre ??
      cliente?.nombre ??
      "tu_marca"
    );
  }, [cuentas, sel, previewPlat, cliente]);

  const conectadasSel = cuentas.filter(
    (c) => sel.has(c.id) && c.estado === "conectada",
  ).length;

  function publicar() {
    setError(null);
    if (!render) {
      setError("Elegí un video de la lista.");
      return;
    }
    if (sel.size === 0) {
      setError("Elegí al menos una cuenta destino.");
      return;
    }
    if (excedido) {
      setError(`El texto supera el límite (${limite}).`);
      return;
    }
    startTransition(async () => {
      try {
        const n = await publicarRender({
          renderId: render.id,
          cuentaIds: [...sel],
          caption,
          programadaEn:
            modo === "programar" ? new Date(programada).toISOString() : null,
        });
        show(
          modo === "programar"
            ? `${n} publicación(es) programadas`
            : `${n} publicación(es) en cola`,
        );
        setSel(new Set());
        setCaption("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar.");
      }
    });
  }

  const sinRenders = renders.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent/10 text-accent">
            <Sparkles className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-fg">
              Componer publicación
            </p>
            <p className="text-[11px] text-muted">
              Elegí el video, las cuentas y armá el texto.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModo((m) => (m === "ahora" ? "programar" : "ahora"))}
            className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted hover:bg-elevated hover:text-fg sm:inline-flex"
          >
            {modo === "ahora" ? (
              <>
                <Zap className="size-3.5" /> Ahora
              </>
            ) : (
              <>
                <Clock className="size-3.5" /> Programado
              </>
            )}
          </button>
          <button
            type="button"
            onClick={publicar}
            disabled={pending || !render || sel.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-brand-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-3.5" />
            {pending
              ? "Enviando…"
              : modo === "ahora"
                ? "Publicar"
                : "Programar"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Rail izquierdo: videos listos */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted">
            <Film className="size-3.5" /> Videos listos
            <span className="ml-auto font-mono text-[11px]">{renders.length}</span>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-3">
            {sinRenders ? (
              <div className="rounded-lg border border-dashed border-line bg-elevated/40 p-3 text-center text-[11px] text-muted">
                No hay videos renderizados.
                <Link
                  href="/estudio"
                  className="mt-1 block font-medium text-accent hover:underline"
                >
                  Ir al Estudio →
                </Link>
              </div>
            ) : (
              renders.map((r) => {
                const on = r.id === renderId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => elegirRender(r.id)}
                    className={
                      "flex w-full items-start gap-2.5 rounded-lg border p-2 text-left transition-colors " +
                      (on
                        ? "border-accent bg-accent/5"
                        : "border-line hover:bg-elevated")
                    }
                  >
                    <span className="relative grid h-16 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-elevated">
                      {r.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.thumbnailUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Film className="size-4 text-muted" />
                      )}
                      {fmtDur(r.duracionSeg) && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-px font-mono text-[9px] leading-none text-white">
                          {fmtDur(r.duracionSeg)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-1">
                        <span className="block min-w-0 flex-1 truncate text-xs font-medium text-fg">
                          {r.titulo || "Sin título"}
                        </span>
                        {on && (
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                        )}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                        <Users className="size-3 shrink-0" />
                        <span className="truncate">
                          {r.clienteNombre ?? "Sin cliente"}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                        <Clock className="size-3 shrink-0" />
                        {fmtFecha(r.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Centro: escenario con el teléfono */}
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-[#0c0b09] p-5">
          {/* Selector de red a previsualizar */}
          <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {PLATS.map((p) => {
              const on = previewPlat === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreviewPlat(p.id)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                    (on
                      ? "bg-white text-neutral-900"
                      : "text-white/70 hover:text-white")
                  }
                >
                  <RedIcon plataforma={p.id} className="size-3.5" />
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 py-1">
            <PhonePreview
              plataforma={previewPlat}
              videoUrl={render?.outputUrl ?? null}
              tipo={render?.tipo}
              handle={handlePreview}
              cliente={cliente?.nombre ?? "Tu marca"}
              caption={caption}
            />
          </div>
        </div>

        {/* Inspector derecho */}
        <aside className="flex w-[22rem] shrink-0 flex-col border-l border-line bg-surface">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {/* Cliente */}
            <section>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Users className="size-3.5" /> Cliente
              </label>
              {render?.clienteId ? (
                <div className="rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg">
                  {cliente?.nombre ?? "—"}
                  <span className="ml-1 text-[11px] text-muted">
                    (del video)
                  </span>
                </div>
              ) : (
                <select
                  value={clienteIdManual}
                  onChange={(e) => {
                    setClienteIdManual(e.target.value);
                    setSel(new Set());
                  }}
                  className="w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              )}
            </section>

            {/* Cuentas destino */}
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Cuentas destino
                </span>
                {sel.size > 0 && (
                  <span className="text-[11px] text-muted">
                    {conectadasSel}/{sel.size} listas
                  </span>
                )}
              </div>
              {cuentas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line bg-elevated/50 px-3 py-3 text-xs text-muted">
                  Este cliente no tiene cuentas.{" "}
                  <Link
                    href="/cuentas"
                    className="font-medium text-accent hover:underline"
                  >
                    Agregar →
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cuentas.map((c) => {
                    const on = sel.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCuenta(c)}
                        className={
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                          (on
                            ? "border-accent bg-accent/10 text-fg"
                            : "border-line text-muted hover:bg-elevated hover:text-fg")
                        }
                      >
                        <RedIcon plataforma={c.plataforma} className="size-4" />
                        {c.nombre}
                        <span
                          className={
                            "size-1.5 rounded-full " +
                            (c.estado === "conectada"
                              ? "bg-success"
                              : "bg-warning")
                          }
                          title={
                            c.estado === "conectada" ? "Conectada" : "Sin conectar"
                          }
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Caption */}
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">
                  Texto de la publicación
                </span>
                <EmojiPicker onPick={insertarEmoji} />
              </div>
              <textarea
                ref={captionRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                placeholder="Escribí el copy que acompaña al video. Sumá emojis 🔥, hashtags #y menciones @…"
                className="w-full resize-none rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm leading-relaxed text-fg outline-none focus:border-accent"
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-muted">
                  Tip: las primeras 2 líneas son las que más se ven.
                </span>
                <span
                  className={
                    "font-mono " + (excedido ? "text-danger" : "text-muted")
                  }
                >
                  {caption.length}/{limite}
                </span>
              </div>
            </section>

            {/* Cuándo */}
            <section>
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Cuándo
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModo("ahora")}
                  className={
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                    (modo === "ahora"
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-line text-muted hover:bg-elevated")
                  }
                >
                  <Zap className="size-3.5" /> Ahora
                </button>
                <button
                  type="button"
                  onClick={() => setModo("programar")}
                  className={
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                    (modo === "programar"
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-line text-muted hover:bg-elevated")
                  }
                >
                  <Clock className="size-3.5" /> Programar
                </button>
              </div>
              {modo === "programar" && (
                <input
                  type="datetime-local"
                  value={programada}
                  onChange={(e) => setProgramada(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                />
              )}
            </section>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
          </div>

          {/* CTA fija abajo */}
          <div className="border-t border-line p-4">
            <button
              type="button"
              onClick={publicar}
              disabled={pending || !render || sel.size === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Send className="size-4" />
              {pending
                ? "Enviando…"
                : modo === "ahora"
                  ? `Publicar en ${sel.size || "—"} cuenta(s)`
                  : `Programar en ${sel.size || "—"} cuenta(s)`}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted">
              El envío real a las redes se activa al conectar OAuth de Meta y TikTok.
            </p>
          </div>
        </aside>
      </div>

      <Toast message={message} />
    </div>
  );
}
