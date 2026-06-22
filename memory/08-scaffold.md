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
- **Caché de dev de Turbopack puede quedar stale** y devolver 404 en rutas que SÍ existen
  (ej. `/login` daba 404 en dev pero estaba en el build). Solución: borrar `apps/web/.next`
  y reiniciar `pnpm dev`.
- **Patrón datos reales**: páginas server (`export const dynamic = "force-dynamic"`) leen con
  Drizzle; mutaciones en `src/server/*.ts` con `"use server"` + `revalidatePath`. El board
  cliente llama las actions con `useTransition`. Ejemplo: Fuentes, Destinos, Moderación.

## Pipeline IA (Pegar URL → generación) — IMPLEMENTADO (Claude)
- `src/server/notas.ts`: `extraerNota(url)` (fetch + `@mozilla/readability` + `linkedom`,
  keyless; falla si el sitio bloquea bots o requiere JS → ahí entrará Firecrawl) y
  `generarVersiones(...)` (inserta article, genera N versiones en paralelo con la capa
  `src/ai`, calcula similitud con `computeSimilarity`, inserta versions en estado `en_revision`).
- `src/ai/prompt.ts`: prompt de reescritura (pide JSON) + `parseRewrite` tolerante.
- Generación **síncrona** dentro del Server Action (Promise.all). Para producción/volumen
  conviene mover a Inngest (`rewriteArticle` ya existe) por timeouts de serverless.
- `src/server/moderacion.ts`: `aprobarVersion` (aprueba una y rechaza hermanas),
  `rechazarNota`, `guardarEdicion` (recalcula similitud).
- Modelo Claude usado: `claude-sonnet-4-6` (verificado).
- **Contenido en Markdown**: la extracción convierte el HTML (Readability `content`) a Markdown
  con `turndown` + `turndown-plugin-gfm` (preserva tablas, listas, subtítulos). Verificado con
  la nota de ANSES (tabla de montos exacta). El prompt instruye conservar tablas/cifras EXACTAS
  y devolver `TÍTULO: ...\n\n<cuerpo md>` (más robusto que JSON para Markdown). Render con
  `react-markdown` + `remark-gfm` (componente `ui/markdown.tsx`).
- **Imágenes**: la extracción trae la imagen principal (`og:image` → fallback primer `<img>`),
  guardada en `articles.imagen_url` (migración 0001). En moderación se puede dejar, eliminar o
  reemplazar (por URL) vía `setImagen`. Subida a Storage = futuro.
- **Pendiente (pedido usuario)**: borrado de "contenido filtrado" más fino. Por ahora el editor
  Markdown (textarea) permite borrar cualquier línea manualmente.

## Infra conectada (2026-06-21)
- **Git/GitHub**: repo en https://github.com/javiernarese2000/scrafity (rama `main`).
- **Supabase**: proyecto ref `ygmjxlhkxykmrlqclbgo`. Claves nuevas (`sb_publishable_*` /
  `sb_secret_*`) en `.env` (gitignored). **Migración aplicada → 8 tablas creadas.**
- **Puerto dev = 5555** (`next dev -p 5555`). Verificado: HTTP 200.
- **Env en monorepo**: `.env` único en la raíz. Drizzle lo carga con `dotenv` en
  `drizzle.config.ts`; Next lo carga con `process.loadEnvFile()` en `next.config.ts`.
- **Conexión DB**: por ahora **conexión directa** (`db.<ref>.supabase.co:5432`, sin región).
  Falta la **región** para pasar al pooler transaction (6543) recomendado en producción.

## Auth (Supabase Auth) — IMPLEMENTADO (2026-06)
- `@supabase/ssr` + `@supabase/supabase-js`. Clientes en `src/lib/supabase/{client,server}.ts`.
- **`apps/web/proxy.ts`** protege todas las rutas y refresca sesión (sin sesión → `/login`).
  OJO: en Next 16 `middleware.ts` está deprecado → se usa **`proxy.ts`** con `export function proxy`.
- `app/login/page.tsx`: email+password (sin signup público). Menú de usuario con cerrar
  sesión en la topbar (`components/shell/user-menu.tsx`). El shell se oculta en `/login`.
- Crear usuarios: `pnpm --filter @scrapify/web seed:user <email> <password>` (script
  `scripts/seed-user.mjs`, usa service role + email_confirm). Ya existe el primer usuario
  admin (narese@gmail.com); la contraseña NO se guarda acá — cambiar desde el dashboard.
- Verificado: `/` sin sesión → 307 a `/login`; login real devuelve token.

## Pendiente inmediato (lo que NO está aún)
- Región de Supabase → migrar `DATABASE_URL` al pooler transaction (puerto 6543).
- Claves de IA (DEEPSEEK_API_KEY, ANTHROPIC_API_KEY) y FIRECRAWL_API_KEY vacías en `.env`.
- Ingesta (Firecrawl/RSS) e IA sin conectar. UI todavía con datos mock.
- Pantalla Ajustes (a propósito, para el final).
