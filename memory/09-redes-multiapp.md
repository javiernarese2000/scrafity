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

## PENDIENTE / próximo paso

- **De-duplicar `apps/web` → `@scrapify/ui`** (convertir sus `components/ui/*` + `lib/cn` en
  re-exports y agregar `@source "../../../packages/ui/src"` en globals.css). Único cambio que toca
  el escaneo de Tailwind de noticias → hacerlo deliberado, con build + revisión visual.
- **Usuario:** crear el segundo proyecto Supabase (DEV) y pasar credenciales (o pedir guía).
  Luego se reemplaza el `.env` local por las de dev.
- En paralelo (usuario): iniciar apps/verificaciones de Meta y TikTok (cuello de botella lento).
