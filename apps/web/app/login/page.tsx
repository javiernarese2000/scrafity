"use client";

import { motion } from "framer-motion";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const PORTALES = [
  { n: "La Nación", i: "LN", c: "#2b4a63" },
  { n: "Clarín", i: "C", c: "#c0392b" },
  { n: "Infobae", i: "i", c: "#e08a1e" },
  { n: "Ámbito", i: "á", c: "#2d6cb5" },
];

function Skeleton({ w }: { w: string }) {
  return <span className="block h-1.5 rounded-full bg-line" style={{ width: w }} />;
}

function Panel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-canvas p-10 lg:flex xl:p-14">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-muted) 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
          opacity: 0.08,
        }}
      />

      <div className="relative flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-brand font-display text-lg font-semibold text-brand-foreground">
          S
        </span>
        <span className="font-display text-xl font-semibold text-fg">Scrapify</span>
      </div>

      <div className="relative max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          IA + Noticias
        </p>
        <h2 className="mt-4 font-display text-[2.4rem] font-medium leading-[1.1] tracking-tight text-fg">
          Generá noticias con inteligencia artificial y publicalas en múltiples
          portales.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
          Automatizá la creación, moderación y distribución de contenido en un
          solo lugar.
        </p>

        {/* Diagrama de flujo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10 flex items-center gap-3"
        >
          <div className="w-40 rounded-xl border border-line/70 bg-surface p-3 shadow-soft">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-accent/15 text-accent">
                <Sparkles className="size-3.5" />
              </span>
              <span className="text-xs font-medium text-fg">Generar nota</span>
            </div>
            <div className="space-y-1.5">
              <Skeleton w="100%" />
              <Skeleton w="85%" />
              <Skeleton w="70%" />
            </div>
          </div>

          <div className="h-px w-5 shrink-0 border-t border-dashed border-line" />

          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="grid size-9 place-items-center rounded-full bg-success/15 text-success">
              <Check className="size-4" />
            </span>
            <span className="text-[10px] text-muted">Lista</span>
          </div>

          <div className="h-px w-5 shrink-0 border-t border-dashed border-line" />

          <div className="space-y-2">
            {PORTALES.map((p, i) => (
              <motion.div
                key={p.n}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.25 + i * 0.08 }}
                className="flex w-40 items-center gap-2 rounded-lg border border-line/70 bg-surface px-2.5 py-1.5 shadow-soft"
              >
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: p.c }}
                >
                  {p.i}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="block truncate text-[11px] font-medium text-fg">
                    {p.n}
                  </span>
                  <Skeleton w="80%" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="size-4 shrink-0 text-accent" />
          Control total, trazabilidad y publicaciones optimizadas con IA.
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line/70 bg-surface px-2.5 py-1 text-[11px] text-muted">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Sistema operativo
        </span>
      </div>
    </aside>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales inválidas. Revisá email y contraseña.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function onForgot() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Escribí tu email arriba y volvé a tocar “¿Olvidaste tu contraseña?”.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setInfo("Si el email existe, te enviamos un enlace para restablecer la contraseña.");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <Panel />

      <main className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo solo en mobile (en desktop está en el panel) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-full bg-brand font-display text-lg font-semibold text-brand-foreground">
              S
            </span>
            <span className="font-display text-xl font-semibold text-fg">
              Scrapify
            </span>
          </div>

          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            Iniciar sesión
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Accedé a tu cuenta para continuar.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-medium text-fg">Correo electrónico</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:ring-2 focus-within:ring-brand/30">
                <Mail className="size-4 shrink-0 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-fg">Contraseña</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:ring-2 focus-within:ring-brand/30">
                <Lock className="size-4 shrink-0 text-muted" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="h-11 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="text-muted transition-colors hover:text-fg"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" className="size-4 accent-[var(--color-brand)]" />
                Recuérdame
              </label>
              <button
                type="button"
                onClick={onForgot}
                className="text-sm font-medium text-accent hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-success">{info}</p>}

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Iniciar sesión"}
            </Button>
          </form>

          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-muted">
            Acceso interno · Scrapify
          </p>
        </div>
      </main>
    </div>
  );
}
