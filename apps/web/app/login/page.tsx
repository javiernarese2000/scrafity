"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Credenciales inválidas. Revisá email y contraseña.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-brand font-display text-xl font-semibold text-brand-foreground">
            S
          </span>
          <h1 className="mt-4 font-display text-3xl font-medium text-fg">
            Scrapify
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ingresá con tu cuenta del equipo
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted">Email</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
                <Mail className="size-4 shrink-0 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vos@equipo.com"
                  className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted">Contraseña</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
                <Lock className="size-4 shrink-0 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted">
          Acceso interno · Scrapify
        </p>
      </div>
    </div>
  );
}
