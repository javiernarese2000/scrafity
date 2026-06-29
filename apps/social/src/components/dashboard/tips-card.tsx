"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-accent/25 bg-accent/[0.06] p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <Lightbulb className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-widest text-accent">
            Tip
          </p>
          <div className="mt-1 min-h-[2.75rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="text-sm leading-relaxed text-fg"
              >
                {TIPS[i]}
              </motion.p>
            </AnimatePresence>
          </div>
          {/* Puntitos de progreso */}
          <div className="mt-3 flex gap-1.5">
            {TIPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Tip ${idx + 1}`}
                onClick={() => setI(idx)}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (idx === i ? "w-5 bg-accent" : "w-1.5 bg-accent/25 hover:bg-accent/50")
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
