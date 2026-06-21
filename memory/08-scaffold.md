# Scaffold Fase 1 — estado

Monorepo creado y verificado: **typecheck + build de Next pasan limpio** (2026-06-21).

## Estructura
```
Scrafity/                      (repo; producto = "Scrapify")
├─ package.json                pnpm workspaces + turbo (scripts: dev/build/typecheck/db:*)
├─ pnpm-workspace.yaml         apps/* packages/* + allowBuilds (esbuild/sharp/protobufjs: true)
├─ turbo.json
├─ tsconfig.base.json          strict, moduleResolution "Bundler"
├─ .env.example                DB, Supabase, DeepSeek, Anthropic, Firecrawl, Inngest
├─ apps/web/                   Next.js 16 (App Router, Turbopack)
│  ├─ app/layout.tsx           next/font: Fraunces + Geist + Geist Mono → CSS vars
│  ├─ app/globals.css          Tailwind v4 (@theme) con tokens de la paleta + dark
│  ├─ app/page.tsx             landing/dashboard placeholder con la paleta
│  ├─ app/api/inngest/route.ts endpoint Inngest (serve)
│  └─ src/
│     ├─ ai/                   capa multi-proveedor: provider.ts, deepseek.ts, claude.ts, index.ts
│     └─ inngest/              client.ts + functions.ts (rewriteArticle)
└─ packages/db/                Drizzle + Postgres (postgres.js)
   ├─ src/schema.ts            tablas del modelo (memory/04)
   ├─ src/index.ts             cliente db LAZY (Proxy; no conecta hasta el 1er uso)
   └─ drizzle.config.ts        usa DIRECT_URL para migraciones
```

## Versiones instaladas (resueltas a actual, 2026-06)
Next **16.2**, React **19.2**, Tailwind **4.3**, Inngest **4.7**, @anthropic-ai/sdk **0.105**,
drizzle-orm **0.45**, drizzle-kit **0.31**, postgres **3.4**, TypeScript **6.0**, turbo **2.9**.

## Particularidades descubiertas (IMPORTANTE para no repetir errores)
- **Inngest v4** cambió `createFunction` a **2 argumentos**: el trigger va dentro de las
  opciones → `createFunction({ id, triggers: [{ event }] }, handler)`. (v3 eran 3 args.)
- **Inngest v4** ya **no exporta `EventSchemas`** (pasó a Standard Schema: `eventType` +
  `staticSchema`). Por ahora tipamos `event.data` con un cast a `RewriteRequested`.
- **Turbopack** NO reescribe `import "./x.js"` → `x.ts` como hace tsc. Con resolución
  `Bundler`, usar imports relativos **sin extensión** (`./schema`, no `./schema.js`).
- El cliente de DB es **lazy** (Proxy) a propósito: importar `@scrapify/db` sin `DATABASE_URL`
  no debe romper `next build`.
- `next lint` está deprecado en Next 16 (el script `lint` quedará pendiente de migrar a ESLint).
- pnpm pide aprobar build scripts: habilitados en `pnpm-workspace.yaml > allowBuilds`.

## Pendiente inmediato (lo que NO está aún)
- No hay `.env` real → para correr jobs/DB hay que crear proyecto Supabase y cargar claves.
- No se corrieron migraciones (`pnpm db:generate` + `db:push`) — falta DATABASE_URL.
- Auth (Supabase Auth) sin implementar. Ingesta (Firecrawl/RSS) sin implementar.
- UI real (pegar URL, cola de moderación) sin implementar — solo placeholder.
- `git init` no ejecutado (el repo no está versionado todavía).
