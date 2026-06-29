"use client";

import { Eye, EyeOff, Loader2, Lock, Mail, Play, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RedIcon } from "@/components/icons/redes";
import { createClient } from "@/lib/supabase/client";
import { registrarLogin } from "@/server/auditoria";

const REDES = [
  { p: "instagram" as const, n: "Instagram" },
  { p: "facebook" as const, n: "Facebook" },
  { p: "tiktok" as const, n: "TikTok" },
];

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
        <span className="grid size-9 place-items-center rounded-lg bg-accent font-display text-lg font-semibold text-brand-foreground">
          Z
        </span>
        <span className="font-display text-xl font-semibold text-fg">
          Zoocial
        </span>
      </div>

      <div className="relative flex max-w-md items-center gap-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Video + Redes
          </p>
          <h2 className="mt-4 font-display text-[2.2rem] font-medium leading-[1.12] tracking-tight text-fg">
            Subí un video, ponele tu logo y zócalo, y publicalo en todas tus
            redes.
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {REDES.map((r) => (
              <span
                key={r.n}
                className="flex items-center gap-2 rounded-full border border-line/70 bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-soft"
              >
                <RedIcon plataforma={r.p} className="size-4" />
                {r.n}
              </span>
            ))}
          </div>
        </div>

        {/* Mockup de video vertical 9:16 con logo + zócalo */}
        <div className="relative aspect-[9/16] w-36 shrink-0 overflow-hidden rounded-2xl border border-line bg-elevated shadow-float">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(150deg, var(--color-brand) 0%, var(--color-accent) 100%)",
              opacity: 0.85,
            }}
          />
          <span className="absolute right-2 top-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
            LOGO
          </span>
          <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/25 backdrop-blur-sm">
            <Play className="size-4 text-white" fill="currentColor" />
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-black/45 px-2.5 py-2 backdrop-blur-sm">
            <span className="block h-1.5 w-4/5 rounded-full bg-white/85" />
            <span className="mt-1 block h-1.5 w-3/5 rounded-full bg-white/50" />
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2 text-xs text-muted">
        <ShieldCheck className="size-4 shrink-0 text-accent" />
        Panel interno · publicación con control total
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
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Credenciales inválidas. Revisá email y contraseña.");
      setLoading(false);
      return;
    }
    await registrarLogin().catch(() => {});
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <Panel />

      <main className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-accent font-display text-lg font-semibold text-brand-foreground">
              Z
            </span>
            <span className="font-display text-xl font-semibold text-fg">
              Zoocial
            </span>
          </div>

          <h1 className="font-display text-3xl font-medium tracking-tight text-fg">
            Iniciar sesión
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Accedé al panel de redes para continuar.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-medium text-fg">Correo electrónico</label>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:ring-2 focus-within:ring-accent/30">
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
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:ring-2 focus-within:ring-accent/30">
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

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-brand-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-muted">
            Acceso interno · Zoocial
          </p>
        </div>
      </main>
    </div>
  );
}
