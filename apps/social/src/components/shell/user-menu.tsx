"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

function iniciales(email: string) {
  const base = email.split("@")[0] ?? "";
  const parts = base.split(/[._-]/).filter(Boolean);
  const chars = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return chars.toUpperCase() || "U";
}

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setEmail(u?.email ?? null);
      const m = (u?.user_metadata ?? {}) as Record<string, unknown>;
      const n =
        typeof m.nombre === "string" && m.nombre.trim()
          ? m.nombre.trim()
          : (u?.email?.split("@")[0] ?? "");
      setNombre(n ? n.charAt(0).toUpperCase() + n.slice(1) : null);
    });
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        className="grid size-9 place-items-center rounded-full bg-accent/15 text-sm font-medium text-accent transition-colors hover:bg-accent/25"
      >
        {nombre || email ? iniciales(nombre ?? email ?? "") : "·"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-56 rounded-[var(--radius)] border border-line bg-surface p-1.5 shadow-float"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-fg">
                {nombre ?? "—"}
              </p>
              <p className="truncate text-xs text-muted">{email ?? ""}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-elevated"
            >
              <LogOut className="size-4 text-muted" />
              Cerrar sesión
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
