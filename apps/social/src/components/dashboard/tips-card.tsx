"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const TIPS = [
  "Subí videos verticales (9:16) — son los que mejor rinden en Reels y TikTok.",
  "Usá el “Margen del borde” del zócalo para que el texto quede dentro de la zona segura.",
  "Programá tus publicaciones y dejá que el despacho automático las suelte a su hora.",
  "Guardá tus diseños como plantillas en el Estudio para reusarlos en un clic.",
  "Conectá Meta desde Cuentas para publicar en Facebook e Instagram al mismo tiempo.",
  "En Componer ves un teléfono que emula cómo se va a ver en cada red.",
  "Activá “Auto” en Publicaciones para que las programadas salgan solas.",
  "Mirá quién hizo qué y cuándo en la sección Auditoría.",
];

export function TipsCard() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % TIPS.length), 6500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-accent/30 bg-surface p-5 shadow-soft">
      {/* Capas decorativas */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.18] via-accent/[0.05] to-transparent" />
      <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-accent/25 blur-3xl" />
      <Sparkles className="pointer-events-none absolute -bottom-5 -right-3 size-40 rotate-12 text-accent/[0.07]" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-2.5">
        <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand-foreground shadow-[0_8px_24px_-6px_var(--color-accent)]">
          <span className="absolute inset-0 animate-ping rounded-xl bg-accent/40 [animation-duration:2.5s]" />
          <Lightbulb className="relative size-5" fill="currentColor" />
        </span>
        <div className="flex flex-1 items-center justify-between">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Tip del día
          </p>
          <span className="font-mono text-[11px] text-muted">
            {i + 1}/{TIPS.length}
          </span>
        </div>
      </div>

      {/* Tip — centrado, ocupa el alto */}
      <div className="relative z-10 flex flex-1 items-center py-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="font-display text-[17px] font-medium leading-snug text-fg"
          >
            {TIPS[i]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progreso */}
      <div className="relative z-10 flex gap-1.5">
        {TIPS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Tip ${idx + 1}`}
            onClick={() => setI(idx)}
            className={
              "h-1.5 rounded-full transition-all " +
              (idx === i
                ? "w-6 bg-accent"
                : "w-1.5 bg-accent/30 hover:bg-accent/60")
            }
          />
        ))}
      </div>
    </div>
  );
}
