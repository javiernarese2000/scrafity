import Link from "next/link";
import type { ReactNode } from "react";

/** Layout público para páginas legales (Términos / Privacidad). Sin login ni shell. */
export function LegalPage({
  title,
  actualizado,
  children,
}: {
  title: string;
  actualizado: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-4">
          <span className="grid size-8 place-items-center rounded-lg bg-accent font-display text-lg font-semibold text-brand-foreground">
            Z
          </span>
          <span className="font-display text-xl font-semibold">Zoocial</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl font-medium tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">Última actualización: {actualizado}</p>
        <div className="prose-zoocial mt-8 space-y-6 text-sm leading-relaxed text-fg/90">
          {children}
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-6 text-xs text-muted">
          <span>© {new Date().getFullYear()} Zoocial</span>
          <span className="flex gap-4">
            <Link href="/terms" className="hover:text-fg">
              Términos
            </Link>
            <Link href="/privacy" className="hover:text-fg">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-fg">
              Ingresar
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-lg font-medium text-fg">{children}</h2>
  );
}
