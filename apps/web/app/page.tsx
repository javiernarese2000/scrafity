export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-ochre)]">
        Fase 1 · MVP
      </p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-tight text-[var(--color-text)]">
        Scrapify
      </h1>
      <p className="mt-4 max-w-xl text-lg text-[var(--color-text-muted)]">
        Agregador y reescritor de noticias con IA. Pegá una URL, generá varias
        versiones y publicá tras moderación humana.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Notas hoy", value: "0" },
          { label: "En revisión", value: "0" },
          { label: "Publicadas", value: "0" },
          { label: "Costo IA", value: "$0.00" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="text-xs text-[var(--color-text-muted)]">{m.label}</p>
            <p className="mt-1 font-mono text-2xl font-medium text-[var(--color-text)]">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <button className="rounded-lg bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink-fg)]">
          Pegar URL
        </button>
      </div>
    </main>
  );
}
