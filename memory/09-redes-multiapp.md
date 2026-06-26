# Redes sociales — segundo panel (multi-app) — EN CURSO (rama `redes`)

Iniciativa nueva (2026-06): herramienta para **subir video → ponerle logo + zócalo
(lower-third con texto) → publicar en redes sociales**. Área distinta a Noticias,
mismo equipo/empresa.

## Decisiones tomadas (con el usuario)

- **Redes objetivo (MVP):** Instagram + Facebook (Meta) y TikTok.
- **Render de video:** self-host **FFmpeg** (no servicio gestionado). Corre en un
  **worker aislado**, NUNCA en el contenedor de la web (un transcode pesado podría
  tirar la app de noticias).
- **Publicación:** **APIs nativas** de cada red (no agregador). Implica registrar apps,
  OAuth, y pasar **revisión/auditoría** (Meta business verification + App Review;
  TikTok content-posting audit) → semanas, **fuera del código**, hay que iniciarlo aparte.
- **Arquitectura:** NO proyecto nuevo separado. **Mismo monorepo, mismo backend (una sola
  base Supabase), paneles separados.** Razón: "mismos clientes". Separar la base obligaría
  a sincronizar clientes entre dos sistemas = infierno.
  - `apps/web` → panel Noticias (lo actual).
  - `apps/social` → panel Redes (nuevo).
  - `apps/worker` → render FFmpeg + jobs de publicación (servicio Railway aislado).
  - `packages/ui` → design system compartido (a EXTRAER de apps/web).
  - `packages/db` → esquema compartido (ya existe).
- **Relación Noticias↔Redes:** NINGUNA a nivel contenido. Solo comparten **clientes** y
  **usuarios**. Puede haber clientes **solo de redes**. La "URL de la noticia" es apenas un
  **campo de texto** en el caption del video (sin FK a `articles`). → No hay puente noticia→video.
- **Entorno de desarrollo:** **segundo proyecto Supabase (free) como DEV**, espejo de prod
  (Auth + Storage + Postgres). Migraciones **dev-first**, y a prod recién en el release.
  Motivo: el esquema se va a iterar y el pipeline de video/publicación ensucia datos; no
  se hace sobre la base real del cliente.

## Modelo de datos objetivo

```
clientes            (id, nombre, …)                     ← compartido, columna vertebral
  ├─ destinations    +clienteId (nullable)              ← noticias (WP/feed) [ya existe]
  └─ social_accounts (clienteId, plataforma, tokenCifrado, expira, …)
video_assets        (clienteId, path, …)
video_renders       (assetId, logo, zócalo, outputPath, estado)
social_publications (renderId, socialAccountId, caption, urlNota?, externalId, estado)
users/profiles      +area (noticias | redes | ambos | admin)
```
Un cliente "solo redes" no tiene `destinations`; uno "solo noticias" no tiene `social_accounts`.

## Plan por pasos (orden)

| # | Paso | Toca prod? | Depende de aprobaciones |
|---|------|-----------|------------------------|
| 0 | Usuario: crear apps Meta + TikTok, iniciar verificación/auditoría | — | empieza ya |
| 1 | Extraer design system a `packages/ui` (refactor sin cambio de comportamiento) | apps/web (imports) | No |
| 2 | Esquema: `clientes` + `destinations.clienteId` + `users.area` (migración aditiva) | schema (aditivo) | No |
| 3 | Scaffold `apps/social` (consume ui+db+auth) | nuevo, no deploya | No |
| 4 | Scaffold `apps/worker` (FFmpeg aislado) | nuevo servicio | No |
| 5 | Flujo de video: subir → logo/zócalo → render → publicar | features | parcial (sandbox) |

Pasos 1 y 2 son la **fundación** y no dependen de Meta/TikTok.

## Flujo de trabajo (seguridad)

- Todo el laburo nuevo en la rama **`redes`**. `main` (lo que Railway despliega) queda
  **congelado**. Producción solo cambia con un `merge` deliberado a `main`.
- Las apps nuevas (`apps/social`, `apps/worker`) **no se despliegan** hasta crear su servicio
  en Railway → pueden estar en el repo sin afectar producción.
- **Hotfix a Noticias durante el desarrollo:** `git checkout main` → fix → push (Railway
  redeploya) → `git checkout redes` → `git merge main` (la rama queda al día).
- Recomendado: mergear el refactor de `packages/ui` a `main` temprano (no cambia comportamiento)
  para que las dos líneas compartan base y no diverjan.

## Entornos (cómo quedó cableado)

- `.env` de la raíz = **DEV** (apunta al 2º proyecto Supabase). Lo leen `drizzle.config.ts`
  (`../../.env`) y `apps/web/next.config.ts` (`process.loadEnvFile('../../.env')`).
- **Producción** = variables en el panel de Railway (no usa el `.env` local).
- `.gitignore` blindado: todos los `.env*` ignorados salvo `.env.example`.

## Progreso

### Paso 1 — `packages/ui` creado (2026-06) — HECHO (parcial)
- Nuevo paquete `@scrapify/ui` (`packages/ui`): hogar canónico del design system.
  Contiene `cn` + las 9 primitivas (badge, button, card, empty-state, markdown, modal,
  page-header, reveal, toast) + `styles.css` (copia del tema de globals.css). `exports` con
  subpaths por archivo (`@scrapify/ui/button`, etc.) + barrel `@scrapify/ui`.
- **DECISIÓN clave de seguridad:** se hizo por **COPIA, no por move**. Motivo: Tailwind v4 usa
  auto-detección de contenido y `packages/ui` queda fuera del árbol que escanea `apps/web`;
  mover los componentes arriesgaba que Tailwind dejara de generar clases únicas (ej. variantes
  arbitrarias de `markdown`) → romper visualmente la app de noticias en prod. Por eso **`apps/web`
  quedó 100% intacto** (verificado: typecheck + build OK).
- Hay duplicación temporal (apps/web tiene su copia, packages/ui la suya). Drift bajo
  (primitivas estables). Se de-duplica en un paso dedicado y verificado (ver abajo).

### Paso 3 — `apps/social` scaffold (2026-06) — HECHO
- Nueva app Next 16 `@scrapify/social` (`apps/social`), panel de Redes, dev en **puerto 5556**.
  Estructura espejo de apps/web pero simplificada: `app/layout.tsx` (mismas fuentes next/font +
  ThemeScript + AppShell), shell propio (`app-shell`, `sidebar`, `topbar`, `nav`, theme toggle),
  y `app/page.tsx` (panel mock: KPIs + strip del flujo Subir→Logo/zócalo→Render→Publicar).
- **Consume `@scrapify/ui`** (Badge, Card, PageHeader, cn) → verificado el paquete end-to-end.
- **Tailwind v4 cableado**: `app/globals.css` hace `@import "tailwindcss"`, `@import
  "@scrapify/ui/styles.css"` (tema compartido) y `@source "../../../packages/ui/src"` (para que
  escanee las primitivas que viven fuera de la app). **Build OK** (compiló + TypeScript + 3 páginas).
- `next.config.ts`: `transpilePackages: ["@scrapify/ui"]`. Sin DB todavía (datos mock).
- No toca prod: app nueva, sin servicio en Railway → no se despliega.

### Paso 4 — `apps/worker` scaffold + render FFmpeg PROBADO (2026-06) — HECHO
- Nuevo paquete `@scrapify/worker` (`apps/worker`), **standalone** (sin deps del workspace; solo
  Node built-ins + typescript de build). Archivos: `src/render.ts` (motor), `src/cli.ts` (CLI de
  prueba), `src/server.ts` (HTTP mínimo: `/health`), `Dockerfile` (node:22-slim + ffmpeg +
  fonts-dejavu-core), `.dockerignore`. tsconfig propio (NodeNext, emite a `dist`).
- **`renderVideo({inputPath, outputPath, logoPath?, zocalo?, width?, height?})`**: escala a 9:16
  (1080×1920, pad), superpone logo PNG (esquina sup. derecha, `overlay`) y dibuja zócalo (barra
  `drawbox` translúcida + `drawtext` con `textfile` para evitar escaping). Spawnea `ffmpeg` por
  `child_process`. Salida h264 + aac, `+faststart`.
- **PROBADO de verdad en Docker** (no hay ffmpeg local en Windows; sí Docker 29.5.2): se construyó
  la imagen (`scrapify-worker`, 256MB) y se corrió un self-test que generó video+logo de prueba y
  renderizó → output verificado **1080×1920 h264 + aac**, con frame de preview. El resultado vive
  en `apps/worker/sample/` (gitignored).
- **Bug encontrado y corregido**: `drawbox` no entiende las variables `W`/`H` (sí `overlay`/
  `drawtext`). Como el frame ya es exactamente W×H tras scale+pad, se usan **posiciones numéricas**.
- **TODO real para la implementación**: el **texto largo del zócalo se corta a la derecha** (no hay
  wrap ni auto-fit de fontsize). Resolver al construir el estudio (wrap por ancho o achicar fuente).
- Pipeline real (recibir jobs por Inngest/DB, bajar inputs de Storage, subir output) → cuando exista
  el esquema de video. Hoy el server solo expone `/health` para poder desplegarlo aislado.

### Entorno DEV cableado (2026-06) — HECHO
- 2º proyecto Supabase **`scrapify-dev`** (ref `dnptcdzimdyeoqykywul`). Conexión DIRECTA funciona
  desde local (la máquina tiene IPv6) → se usa para `DATABASE_URL` y `DIRECT_URL`.
- `.env` local → **DEV** (conserva ANTHROPIC_API_KEY y ENCRYPTION_KEY de antes). Credenciales de
  **PROD** movidas a `.env.production` (gitignored, solo para migraciones de release).
- `.gitignore` ya ignora todos los `.env*` salvo `.env.example` (verificado: ningún `.env` entra a git).
- Migraciones 0001–0015 aplicadas a DEV. **15+1 tablas** (incluida `clientes`).
- **Usuario admin en DEV**: narese@gmail.com / `scrapify-dev-2026` (cambiar cuando quiera).

### Paso 2 — `clientes` + `area` (2026-06) — HECHO
- `schema.ts`: tabla **`clientes`** (id, nombre, notas, activo, timestamps), enum **`area`**
  (`noticias`|`redes`|`ambos`) en `users.area` (default `ambos`), y FK **`destinations.clienteId`**
  (nullable, onDelete set null). Relaciones cliente↔destinos. Migración **0015** generada y aplicada
  a DEV (verificado: tabla, columnas y FK presentes). typecheck db + web OK.
- Pendiente del modelo (cuando se arme el estudio): `social_accounts`, `video_assets`,
  `video_renders`, `social_publications` (con caption + urlNota opcional).

### Paso — Auth del panel de Redes (2026-06) — HECHO
- `apps/social`: cliente Supabase (`src/lib/supabase/client.ts` + `server.ts`), **`proxy.ts`**
  (Next 16 usa `proxy`, no middleware) que redirige a `/login` sin sesión y a `/` si ya logueado.
  `app/login/page.tsx` split-screen con identidad de Redes (mockup de video 9:16 + chips IG/FB/TikTok),
  `user-menu` con logout en el topbar, y AppShell saltea el armazón en `/login`.
- `next.config.ts` ahora carga `../../.env` (como apps/web) para tener las vars NEXT_PUBLIC.
- Deps: `@supabase/ssr` + `@supabase/supabase-js`. **Build + smoke test OK** (`/`→307→`/login`, `/login`→200).
- Login con el admin de dev: narese@gmail.com / `scrapify-dev-2026`.
- **Pendiente fino**: gate por `area` (hoy gate = autenticado). Necesita sincronizar el usuario de
  Supabase Auth con una fila en la tabla `users` (con su `area`). Se hace cuando importe.

## ESTRATEGIA (definida con el usuario)
Cerrar TODO el panel a nivel UI/UX primero (con datos dev/mock), y dejar la conexión real a
Meta/TikTok para el final (pruebas). El usuario dispara las apps/aprobaciones en paralelo.
Orden de pantallas: Clientes → Cuentas → Estudio (subir+logo+zócalo+preview) → Publicaciones.

### Pantalla Clientes (2026-06) — HECHO
- `apps/social`: `src/server/clientes.ts` (server actions: listar con conteo de destinos vía left
  join, crear, actualizar, toggle activo, eliminar), `app/clientes/page.tsx` (server component) y
  `components/clientes/clientes-board.tsx` (grilla de cards + modal nuevo/editar + activar/pausar +
  borrar, con Toast). Usa `@scrapify/ui`. Se agregó `@scrapify/db` + `drizzle-orm` a apps/social
  (+ transpilePackages). Build OK. Hay 2 clientes demo en dev.

### Permisos (2026-06)
- `.claude/settings.local.json` (gitignored): patrones amplios `Bash(pnpm:*)`, `Bash(git:*)`,
  `Bash(docker:*)`, `Bash(node:*)`, `taskkill:*`, `mkdir:*`, `rm -rf apps/*/.next`. Reducen los
  prompts del flujo de dev. (Trade-off: pnpm/node/docker permiten ejecución arbitraria en el repo.)

### Pantalla Cuentas + tabla social_accounts (2026-06) — HECHO
- Esquema: enums `social_platform` (instagram|facebook|tiktok) y `social_account_status`
  (conectada|desconectada|error); tabla `social_accounts` (clienteId cascade, plataforma, nombre/
  handle, externalId, estado, credencialesCifradas para OAuth futuro, expiraEn). Relación
  cliente↔socialAccounts. Migración **0016** aplicada a dev.
- `apps/social`: `server/cuentas.ts` (listar por cliente, agregar, toggle conexión MOCK, eliminar),
  `app/cuentas/page.tsx`, `components/cuentas/cuentas-board.tsx` (agrupado por cliente, modal
  agregar con selector cliente/plataforma/handle, conectar/desconectar mock, eliminar, banner de
  "OAuth real al final"). Build OK.

### Pantalla Estudio (2026-06) — HECHO (UI, render staged)
- `apps/social`: `app/estudio/page.tsx` + `components/estudio/estudio-board.tsx`. **Preview en vivo**
  en frame de teléfono: el `<video>` real (objectURL) con logo y zócalo superpuestos por CSS que se
  actualizan al toque. Controles: formato 9:16/1:1/16:9, carga de video y logo por drag&drop,
  posición (4 esquinas) y tamaño del logo, 4 estilos de zócalo (barra/degradado/bloque/minimal),
  tipografía (display/sans/mono vía vars del tema), tamaño, color de texto y barra, opacidad, y
  destino (cliente + chips de cuentas). Todo client-side. Build OK.
- **Render real STAGED**: "Enviar a render" hoy muestra toast. Falta: subir el video a Storage,
  crear `video_assets`/`video_renders`, encolar al worker (que ya compone con FFmpeg) y traer el MP4.
  El preview CSS es aproximación; el MP4 final lo hace el worker con el mismo layout.

### Pantalla Publicaciones (2026-06) — HECHO → PANEL UI/UX CERRADO
- Esquema: enum `social_publication_status` + tabla `social_publications` (clienteId cascade,
  socialAccountId set null, plataforma, videoTitulo, caption, urlNota, estado, urlPublicada,
  externalId, error, publicadaEn). Relaciones cliente/cuenta. Migración **0017** aplicada a dev.
- `apps/social`: `server/publicaciones.ts` (listar con join a cliente), `app/publicaciones/page.tsx`,
  `components/publicaciones/publicaciones-board.tsx` (métricas por estado, filtros cliente/red/estado,
  listado con badge de estado + link). 5 publicaciones demo en dev. Build OK.

## ESTADO: panel de Redes COMPLETO a nivel UI/UX
Pantallas: Login ✅, Panel(mock) ✅, Clientes ✅, Cuentas ✅, Estudio (preview en vivo) ✅,
Publicaciones ✅. Dev server en :5556. Todo en rama `redes`, prod intacto.

## PENDIENTE — fase de CONEXIÓN (lo que falta para producción)
1. **Render real**: bucket `videos` en Supabase Storage; al "Enviar a render" subir el video,
   crear `video_assets`/`video_renders`, encolar al worker (FFmpeg, ya probado), traer el MP4.
2. **OAuth + publicación**: Meta (IG/FB) y TikTok — apps + verificación/auditoría (USUARIO, en curso),
   guardar tokens cifrados en `social_accounts.credencialesCifradas`, publicar y actualizar
   `social_publications`.
3. **Panel (dashboard)**: pasar de mock a métricas reales.
4. Gate por `area` (hoy gate = autenticado).
5. Deploy: crear servicios Railway para `apps/social` y `apps/worker` cuando se decida.
- **Publicaciones** (estado por red).
- Tablas faltantes del modelo: `social_accounts`, `video_assets`, `video_renders`, `social_publications`.
- **De-duplicar `apps/web` → `@scrapify/ui`** (convertir sus `components/ui/*` + `lib/cn` en
  re-exports y agregar `@source "../../../packages/ui/src"` en globals.css). Único cambio que toca
  el escaneo de Tailwind de noticias → hacerlo deliberado, con build + revisión visual.
- **Estudio de video** + tablas `social_accounts`/`video_*` + conectar worker al pipeline.
- En paralelo (usuario): iniciar apps/verificaciones de Meta y TikTok (cuello de botella lento).
