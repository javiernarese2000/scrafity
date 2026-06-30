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

### Mejoras de diseño del panel (2026-06) — HECHO
- **Sidebar colapsable** (riel de íconos, persistente en localStorage `redes-sidebar-collapsed`).
- **Contenido full-width** en todas las pantallas (se sacaron los `max-w`).
- **Dashboard premium** (`app/page.tsx` RSC + `server/dashboard.ts`): KPIs reales, barras por estado,
  distribución por red, actividad reciente, accesos rápidos.
- **Estudio = editor pro a pantalla completa** (3 paneles, sin scroll de página): toolbar (formato +
  CTA), rail izq media (video/logo), escenario oscuro central con preview grande ajustado al alto,
  rail der inspector. AppShell deja `/estudio` sin padding/scroll (flag `isEditor`).
- **Estudio — más herramientas para editores**: 8 tipografías (Serif/Sans/Mono + Anton/Bebas/Oswald/
  Archivo/Inter, cargadas en layout vía next/font), 7 estilos de zócalo (barra/degradado/bloque/
  resaltado/caja/cinta/minimal), padding, posición (abajo/centro/arriba), alineación, MAYÚSCULAS,
  y opacidad del logo.

### Plantillas de diseño en el Estudio (2026-06) — HECHO
- Tabla **`plantillas`** (id, nombre, clienteId nullable [null=global], config jsonb) + migración 0018.
- `server/plantillas.ts` (listar/crear[returning]/eliminar). Estudio: menú "Plantillas" en la toolbar
  con **5 presets de fábrica** (Breaking, Cita, Deportivo, Resaltado, Degradado) + plantillas guardadas
  (filtradas por global o cliente actual). "Guardar diseño actual" → modal (nombre + alcance global/
  cliente) guarda `ConfigEstudio` (logo embebido como **data URL**, zócalo, formato; NO el texto ni el
  video). Aplicar con 1 clic, eliminar. El logo ahora se carga como data URL (FileReader) para poder
  persistirlo en la plantilla. La lista se maneja en estado del cliente (sin router.refresh, para no
  resetear el editor).

### Estudio: logo libre + marca de agua (2026-06) — HECHO
- **Logo con arrastre libre** dentro del preview (estado logoX/logoY %, pointer capture sobre el
  frame con `frameRef`), anclado al centro; presets de esquina como atajo (ESQUINAS setean x/y).
- **Marca de agua** (`MarcaAgua`): texto, modo mosaico (repetido rotado) o centrado, tamaño, color,
  opacidad; va detrás del logo (z-3) y del zócalo. Controles en rail izq (grupo "Marca de agua").
- Ambos se guardan en plantillas (`logoX/logoY`, `wm*` en ConfigEstudio).

### Cierre del Estudio: guías por formato + efectos de texto (2026-06) — HECHO
- **Guías respetan el formato** (`Guias` ahora recibe `aspecto`): 9:16 = blueprint completo de la red;
  1:1 = feed (casi todo seguro, nota "UI por fuera del video"); 16:9 = barra de controles. Helper
  `GuiaWrap` (dim + rect + etiqueta) compartido.
- **Efecto de texto del zócalo**: ninguno/sombra/contorno/ambos (`efectoCss`), se aplica a todos los
  estilos vía `baseText` y se guarda en plantillas (`ConfigEstudio.efecto`).
- **ESTUDIO cerrado a nivel diseño.** Próximo: Planificador.

### Guías como blueprint de la red (2026-06) — HECHO
- Las safe-zones evolucionaron: el toggle "Guías" + selector **TikTok/Instagram/Facebook** dibuja un
  **blueprint de la UI real** de cada red sobre el preview (componente `Guias` + `GBtn`): columna
  derecha de acciones (avatar con +, botones, disco de música en TikTok), bloque de caption abajo-izq,
  barra de progreso y top propio de cada red, además del rectángulo punteado de zona segura.

### Safe-zones en el Estudio (2026-06) — HECHO
- Toggle "Guías" en la toolbar + selector de red (TikTok/Reels/Feed). Overlay sobre el preview:
  oscurece los márgenes que tapa la UI de cada red (derecha botones, abajo caption, top) con
  `box-shadow` spread grande clippeado por el frame, y marca la zona segura con borde punteado +
  etiqueta. Specs de márgenes por red en const `SAFE`. Ayuda a no poner zócalo/logo tapados.

### Planificador / Agenda (2026-06) — HECHO
- Campo `programada_en` en `social_publications` (migración 0019). Nav: ítem **Agenda** (CalendarClock).
- `server/planificador.ts`: listar (por rango de día), crear (returning), mover, actualizar, eliminar.
- `app/agenda/page.tsx` + `components/planificador/planificador-board.tsx`: **timeline de 24h por día**
  (HOUR_H=56px), navegación día + Hoy, **línea de ahora**, bloques por hora (color por red, algoritmo
  de **lanes** para solapados), **arrastre vertical** para reprogramar (snap 5min, persiste con
  `moverProgramada`), tocar hueco vacío → crear a esa hora, clic en bloque → editar/eliminar (modal con
  cliente/cuenta/hora/título/caption). La fecha y las horas se manejan en local; se guarda timestamptz.
- Sembradas 4 programadas de hoy en dev (cliente Diario El Sur).
- **Vista semana + zoom** (2026-06): planificador unificado por columnas. Toggle Día/Semana (7 columnas
  con encabezado de días + hoy marcado), zoom 36–160px/hora con subdivisiones de hora al acercar para
  ver minutos. Drag vertical en ambas vistas (mantiene el día de la columna), crear tocando hueco en
  cualquier día, editar al clic. Navegación por día o por semana.
- Pendiente futuro: conectar con el despachador real (que suelte a la hora `programada_en`).

### Íconos de marca de las redes (2026-06) — HECHO
- Componente `components/icons/redes.tsx` → `RedIcon({ plataforma, className })` con los SVG oficiales
  (Simple Icons): Instagram con degradado, Facebook azul #1877F2, TikTok `currentColor` (text-fg para
  verse en claro/oscuro). Reemplaza los puntitos de color en: cuentas, planificador, dashboard,
  publicaciones, login y selectores del estudio (destino + safe-zones). Reconocimiento visual inmediato.

### Render real — cola + worker (2026-06) — HECHO (motor)
- **Cola en la base**: tabla `video_renders` (estado en_cola/procesando/listo/error/cancelado,
  progreso 0-100, config jsonb, source_path, output_path/url, duracion_seg, intentos, started/finished),
  migración 0020. Bucket Storage **`videos`** creado en dev (público).
- **Worker** (`apps/worker`): `db.ts` (claim con FOR UPDATE SKIP LOCKED → no duplica, concurrencia 1
  → no satura), `storage.ts` (supabase service: descargar source / subir output), `render.ts`
  `renderFromConfig` (baseline: scale 9:16/1:1/16:9 + logo overlay x/y/size/opacidad + zócalo barra
  drawtext) con **progreso real** vía `-progress pipe:1` (out_time/duración), `queue.ts` (loop poll 3s),
  `server.ts` (/health + inicia la cola). Deps nuevas: postgres + @supabase/supabase-js.
- **PROBADO en Docker end-to-end**: seed (sube source + inserta job) → worker claim → progreso
  0→3→36→74→100% con tiempo → output 1080x1920 subido a Storage (URL pública) → estado listo.
  Frame verificado (logo + zócalo). ~12s para 3s de video.
- **INFRA IMPORTANTE**: el worker (contenedor) **NO puede usar la conexión directa** (IPv6) — debe usar
  el **pooler IPv4**. DEV pooler = `aws-1-us-east-2.pooler.supabase.com:6543`, user
  `postgres.dnptcdzimdyeoqykywul`. (Para Railway, igual: DATABASE_URL del worker = pooler.)
- Helpers de test en `apps/worker/sample/` (gitignored): seed-test.mjs, poll.mjs, worker.env.
### Estudio enganchado al render (2026-06) — HECHO
- `server/render.ts` (apps/social): `prepararSubida(ext)` (signed upload URL con service role),
  `encolarRender({sourcePath,titulo,clienteId,config})` (inserta video_renders en_cola), `estadoRender(id)`
  (estado/progreso/outputUrl/duración/error + posición en cola).
- Estudio: "Enviar a render" → sube el video a Storage con **signed URL** (uploadToSignedUrl, sin pasar
  por Next) → encola con la config actual (+texto) → **modal con barra de progreso moderna** (subiendo
  → en cola con puesto → renderizando % + tiempo transcurrido + ETA → listo con **preview** del video y
  descarga). Poll cada 1.2s. `videoFile` guardado para la subida.
- **Worker corriendo en dev**: contenedor `zoo-worker` (docker, `--restart unless-stopped`, usa
  `apps/worker/sample/worker.env` = pooler us-east-2). Procesa la cola en vivo.

### Fidelidad visual del render (2026-06) — HECHO
- El render replica el preview: **7 estilos de zócalo** (barra/degradado/bloque/resaltado/caja/cinta/
  minimal vía drawbox + drawtext `box`), **8 tipografías** (DejaVu Serif/Sans/Mono/Bold + Anton/Bebas/
  Oswald descargadas en el Dockerfile a `/usr/share/fonts/truetype/zoocial`), MAYÚSCULAS, alineación,
  posición (abajo/centro/arriba), padding, **efectos de texto** (sombra/contorno vía shadow/border de
  drawtext) y **marca de agua** (centro / mosaico en grilla). Escalado preview→render = width/380.
  `render.ts` (buildZocalo/buildMarca/buildArgsConfig), `queue.ts` mapConfig con FONT_MAP.
- **Probado en Docker**: config rica (cinta + Bebas + MAYÚSCULAS + contorno + marca mosaico) → frame OK.
- **Fix (2026-06)**: (1) el video va **cover** (force_original_aspect_ratio=increase + crop), no
  contain — llena el cuadro como el preview, sin barras negras. (2) **word-wrap** del zócalo: drawtext
  no envuelve solo → se parte el texto por ancho (según fuente/tamaño/padding) y la barra crece con las
  líneas. Probado con texto largo + source horizontal.
- Aproximaciones conocidas: degradado = barra translúcida (sin gradiente real), marca de agua sin
  rotación, caja/bloque con el box de drawtext (rectángulo, sin esquinas redondeadas).
- Worker `zoo-worker` corriendo con la imagen nueva.

- **PENDIENTE del render**: (1) panel/estado de la cola, cancelar, reintentar, miniatura; (2) Railway:
  desplegar el worker (DATABASE_URL = pooler) + bucket videos en prod; (3) pulir aproximaciones
  (gradiente real, rotación de marca) si hace falta.

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
- **Fix tipografía/márgenes (2026-06)**: FONT_MAP usa variantes Bold (más cuerpo, el regular salía flaco vs el preview); márgenes del zócalo respetan el padding tal cual (se sacaron fudges +28/+20/+40), barra con padding simétrico y flush al borde.
- **Fix degradado (2026-06)**: el geq por-fotograma colgaba el render (y tiró Docker). Ahora el gradiente se pre-renderiza a un PNG de 1 frame y se superpone con movie+overlay. Rápido (8.7s) y correcto.

### Render WYSIWYG via overlay HTML/Chromium (2026-06) — HECHO
- Se reemplazó TODO el motor FFmpeg drawtext/drawbox/geq/factores-por-fuente/wrap por: el worker arma el overlay (logo+zócalo+marca) como HTML/CSS idéntico al preview, con las fuentes reales (Google Fonts), lo rasteriza con **Chromium (Playwright)** a un PNG transparente, y FFmpeg solo hace cover del video + overlay del PNG.
- `overlay.ts`: getBrowser/renderOverlayHtml + buildOverlayHtml(cfg,W,H) (replica los 7 estilos de zócalo, logo libre, marca centro/mosaico, efectos). `render.ts`: probeDuration + renderFromConfig (cover+overlay+progreso). `queue.ts`: simple (descarga, render, sube). Se borró cli.ts y el motor drawtext.
- El Estudio manda `previewW` (ancho real del frame medido) → escala exacta preview→render. Se quitó el hack del 1.15.
- Dockerfile: ffmpeg + `npx playwright install --with-deps chromium`. Imagen más pesada (~1GB) pero fidelidad pixel-perfect.
- PROBADO: degradado centrado con Fraunces = idéntico al preview.
- Para Railway: el worker necesita Chromium (ya en el Docker) + DATABASE_URL pooler + bucket videos.

### Panel de la cola de renders + armado de publicación (2026-06) — HECHO
- Panel `/renders` (`renders-board.tsx`, polling 2.5s): miniatura, estado, barra de progreso en vivo,
  acciones por estado: Pausar/Reanudar (en_cola↔pausado), Cancelar (aborta el FFmpeg vía AbortSignal — el
  worker hace `getEstado` cada 2s y mata el proceso si pasó a cancelado), Reintentar (error/cancelado→en_cola),
  Descargar, Eliminar, Publicar.
- Migración 0021: enum `video_render_status` suma `pausado`; `video_renders.thumbnail_url` (miniatura
  `extractThumbnail` → `thumbs/{id}.jpg` al terminar).
- Armar publicación (migración 0022): `social_publications` enlaza `video_render_id` + `video_url`. Acción
  `publicarRender({renderId, cuentaIds[], caption, programadaEn})` crea UNA publicación por cuenta en
  `en_cola`, con el video del render, caption y hora (ahora=now / programar=datetime). Aparecen en Agenda
  y Publicaciones. El envío real espera OAuth Meta/TikTok.
- Diálogo `publicar-dialog.tsx`: cuentas con iconos de marca (RedIcon), caption (prefill con título),
  Ahora/Programar; si el render no tiene cliente, selector de cliente.
- Decisión del usuario: "las dos" vías → manual desde el panel (HECHO) + auto desde el Estudio (PENDIENTE).

### DIAGNÓSTICO CLAVE: saturación de conexiones del host directo (2026-06) — RESUELTO
- Síntoma: Storage de dev tiraba "Internal Server Error" / "connection to the database timed out" y
  `db:migrate` colgaba. PARECÍA proyecto Supabase pausado; NO LO ESTABA.
- Causa real: `pg_stat_activity` mostró 50 conexiones `postgres.js` idle del usuario directo `postgres`
  (host `db.<ref>.supabase.co:5432`) con `max_connections=60`. Conexiones FILTRADAS de dev servers viejos.
  Sin slots, el Storage de Supabase (que también usa el host directo) no podía conectar a su DB → timeouts.
- Fix permanente: en `.env`, `DATABASE_URL` ahora apunta al POOLER de transacción 6543
  (`postgres.<ref>@aws-1-us-east-2.pooler.supabase.com:6543`, ya con `prepare:false` en packages/db).
  `DIRECT_URL` queda en 5432 directo (drizzle-kit migra con DIRECT_URL). Se mataron las 50 idle con
  `pg_terminate_backend`. Storage volvió a `ok`.
- Si `db:migrate` cuelga por saturación: aplicar el SQL por el pooler a mano y registrar la migración en
  `drizzle.__drizzle_migrations` (hash sha256 del .sql + `when` del _journal.json).
- IMPORTANTE próxima sesión: reiniciar dev servers (web y social) para tomar el `.env` nuevo (pooler).
  `docker restart zoo-worker` NO recarga `worker.env` (mantiene el env del `docker run`); para cambiarlo hay
  que recrear el contenedor.

### Sección "Componer" — compositor de publicaciones (2026-06) — HECHO (UI)
- Nueva pantalla **/componer** (nav "Componer", icono Megaphone, entre Renders y Agenda): editor a
  pantalla completa (agregado a `isEditor` en `app-shell`, igual que el Estudio).
- **3 paneles**: (izq) rail de **videos listos** (renders `estado='listo'` con `outputUrl`, miniatura,
  seleccionable); (centro) **escenario oscuro con teléfono** que **emula la publicación** según la red,
  con segmented control TikTok/Reel/Feed; (der) inspector: Cliente (fijo si el render trae cliente, si no
  selector), **Cuentas destino** (chips con RedIcon + punto verde/ámbar conectada/sin conectar, contador
  "listas"), **caption** con **EmojiPicker** propio (popover por categorías, inserta en el cursor del
  textarea) + contador con límite por red (min entre redes seleccionadas: IG/TikTok 2200, FB 5000),
  Cuándo (Ahora/Programar datetime-local), CTA fija.
- **Phone preview** (`components/componer/phone-preview.tsx`): 3 skins fieles — TikTok (rail de acciones,
  disco girando, "Para ti"), Instagram Reel (rail IG, "Reels", botón Seguir), Facebook Feed (card con
  header avatar+Globe, texto arriba, video cuadrado, barra Me gusta/Comentar/Compartir). `<video>`
  real (muted/loop/autoplay) del render elegido + caption en vivo. Frame de teléfono con notch.
- **Reusa `publicarRender`** (server/render.ts) tal cual → crea `social_publications` `en_cola` por
  cuenta (ahora o programadaEn). No hizo falta server action nueva. Aparecen en Agenda y Publicaciones.
- Archivos: `app/componer/page.tsx` (carga clientes con cuentas + renders listos), `componer-board.tsx`,
  `phone-preview.tsx`, `emoji-picker.tsx`. Build + typecheck OK.
- El envío real a las redes sigue esperando OAuth Meta/TikTok (banner lo aclara).

### Mejoras Renders + Estudio (2026-06) — HECHO
- **Renders** (`renders-board.tsx`): (1) la **miniatura es clickeable** → abre un modal con el
  **video** (`<video controls autoPlay>`) + descarga; hover muestra botón play. (2) **Eliminar ahora
  pide confirmación** ("¿Eliminar este contenido?") en vez de borrar directo — modal propio con
  Cancelar/Eliminar (estados `preview`/`confirmDel`). La miniatura ya existía (worker la genera).
- **Estudio — Marco / margen del video**: nuevo grupo "Marco / margen" (icono Frame) en el rail
  izquierdo. Estado `margen` (0–35% inset uniforme) + `margenColor`. Achica el video y lo enmarca
  con un color para que el contenido quede dentro de la zona segura. Preview: el `<video>` pasa a
  `object-contain` con `inset:margen%` y el frame toma `backgroundColor=margenColor`; logo/zócalo/
  guías quedan full-frame (igual que el render). Se guarda en `ConfigEstudio` (margen, margenColor) →
  plantillas.
- **Worker** (`apps/worker/src/render.ts`): `renderFromConfig` replica el margen — si `margen>0`,
  arma `color=c=<hex>:s=WxH[bg]` + `scale=iw:ih:force_original_aspect_ratio=decrease` (sin recortar) +
  `overlay=(W-w)/2:(H-h)/2:shortest=1`, y el overlay PNG queda full-frame. Helpers `even()` y
  `ffColor()` (#rrggbb→0xrrggbb). `queue.ts` pasa `job.config` crudo, así que los campos nuevos llegan.
- **OJO deploy**: el contenedor `zoo-worker` corre la imagen vieja → para que el **render** aplique el
  margen hay que **reconstruir la imagen del worker y recrear el contenedor**. El preview del Estudio
  ya funciona sin rebuild.

### Fix margen video + Margen del borde del zócalo (2026-06) — HECHO
- **Bug del "Marco / margen" del video**: el shorthand `inset:${margen}%` no se expandía (el video
  quedaba chico arriba-izquierda). Fix: longhands explícitos `top/left/right/bottom` en el style del
  `<video>` (estudio-board). Ahora a 1% el video se achica centrado y enmarcado, correcto.
- **NUEVO: "Margen del borde" del zócalo** (lo que el usuario realmente necesitaba): slider 0–40% en
  el grupo Zócalo (se oculta si posición=centro). Separa el zócalo del borde para meterlo en la zona
  segura de las guías. Estado `zocaloMargen` → `ConfigEstudio.zocaloMargen` (plantillas). El componente
  `Zocalo` recibe `margenBorde` y usa `wrapStyle` (`bottom:${m}%` si abajo / `top:${m}%` si arriba)
  mergeado en los 7 estilos de zócalo (antes era `bottom-0`/`top-0` fijo).
- **Worker** (`overlay.ts`): el `wrap` del zócalo ahora usa `top:${mB}%`/`bottom:${mB}%` con
  `mB=cfg.zocaloMargen` (% del alto), replicando el preview. Requiere rebuild del worker para el render.
- **Fix degradado con margen** (2026-06): al levantar el degradado quedaba una **línea dura** abajo
  (el borde sólido flotando). Solución: el estilo degradado (abajo/arriba) ahora es **2 capas** — el
  gradiente queda **pegado al borde** (height `44+margen%`, se desvanece natural, sin línea) y el
  **texto** se separa del borde por el margen. Centro queda igual (banda centrada). Aplicado en preview
  (estudio-board) y worker (overlay.ts).

### Organización de archivos en Storage + retención de originales (2026-06) — HECHO
Antes: bucket `videos` plano por tipo con nombres UUID (`sources/<uuid>`, `renders/<jobId>`,
`thumbs/<jobId>`); los originales (lo más pesado) nunca se borraban.
- **(1) Paths por cliente/mes + nombres legibles**: `prepararSubida({ext, clienteId, titulo})`
  (`apps/social/src/server/render.ts`) ahora arma
  `<cliente-slug>--<id8>/<YYYY-MM>/src/<titulo-slug>-<rnd6>.<ext>` (carpeta `sin-cliente` si no hay
  cliente). El **worker** (`queue.ts`) deriva el resultado/miniatura de la carpeta del source:
  `<carpeta>/out/<titulo>-<id6>.mp4` y `<carpeta>/thumb/<...>.jpg`. Si el source es viejo (esquema
  plano) cae al `renders/<id>.mp4` de antes. Helper `slug/slugify` en web y worker (sin deps).
  Estudio pasa `clienteId` + `titulo` a `prepararSubida`.
- **(2) Retención de originales (TTL 14d)**: columna **`video_renders.source_eliminado`** (bool,
  migración **0023**). Worker: `retencion.ts` `iniciarRetencion()` (loop cada 6h, 1ª pasada a los 30s)
  borra de Storage los `source_path` de renders en estado terminal (listo/error/cancelado) con
  >14 días y marca `source_eliminado=true`. `db.ts`: `sourcesParaLimpiar(dias)` (usa
  `make_interval(days=>)`) + `marcarSourceEliminado`. `storage.ts`: `borrar(path)`. Arrancado en
  `server.ts`. El **resultado y la miniatura quedan**; solo se borra el original.
- UI: `listarRenders` expone `sourceEliminado`; en `renders-board`, si el original se borró, en
  error/cancelado se muestra "original borrado" en vez de **Reintentar** (reintentar necesita el source).
- **DECISIÓN pendiente del usuario**: en vez de solo borrar, guardar una **copia liviana** del original
  (baja resolución) — a definir después.
- **OJO deploy**: los paths nuevos del **source** ya aplican (los arma la app social). La derivación
  del **output/thumb** y la **retención** son código del worker → requieren **rebuild de `zoo-worker`**.
  La migración 0023 ya está aplicada a dev.

### Conexión con Meta (OAuth) — Fase 1 HECHA (2026-06)
- **App de Meta del usuario** creada (developers.facebook.com, tipo Business). Credenciales en `.env`:
  `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI=http://localhost:5556/api/meta/callback`.
  (El App Secret se pegó en el chat → **recordar resetearlo** al terminar las pruebas.)
- **Flujo OAuth (server-side)**: `src/lib/meta.ts` (authUrl, exchangeCode, longLivedToken `fb_exchange_token`,
  listPagesWithIg vía `/me/accounts?fields=name,access_token,instagram_business_account{id,username}`,
  Graph v21.0, SCOPES = pages_show_list/read_engagement/manage_posts + instagram_basic/content_publish +
  business_management). `app/api/meta/login/route.ts` (arranca con `?cliente=<id>`, state=base64{c,n} +
  cookie `meta_oauth` para CSRF). `app/api/meta/callback/route.ts` (verifica state, code→token corto→
  largo→Páginas, `conectarPaginas`, redirige a `/cuentas?meta=ok&fb=&ig=` o `&error&msg=`).
- **`src/server/meta.ts` `conectarPaginas`**: por cada Página hace upsert de una cuenta `facebook`
  (externalId=pageId, token cifrado) y, si tiene IG vinculado, una `instagram` (externalId=igUserId,
  MISMO token de Página). Idempotente por cliente+plataforma+externalId. `src/lib/crypto.ts` copiado de
  Noticias (AES-256-GCM, ENCRYPTION_KEY).
- **UI** (`cuentas-board.tsx`): botón **"Conectar con Meta"** (azul FB) por cliente → `<a>` a
  `/api/meta/login?cliente=<id>` (navegación real, no router). Toast del resultado leyendo
  `?meta=` de la URL + `router.refresh()`. Banner actualizado.
- **Modo desarrollo**: como el usuario es admin de la app, los permisos avanzados se otorgan **sin App
  Review** para sus propias Páginas/IG. Local sin HTTPS funciona (Meta exime `localhost`).
- **Prerrequisitos del usuario a verificar**: IG debe ser **Profesional (Business/Creator) vinculada a
  una Página de FB** (estaba "no seguro" → el propio flujo lo revela: si no hay `ig`, conecta solo FB).
- Dev server reiniciado para tomar el `.env` nuevo (las vars se cargan al arrancar).
- **RESULTADO de la 1ª prueba (2026-06)**: conectó la **Página de FB "Zoocial"** ✅ (valida OAuth +
  token + cifrado end-to-end). NO apareció IG porque el usuario **todavía no tiene cuenta de IG** — la
  está creando y la va a vincular a la Página (después reconecta y aparece).

### Publicación real a Meta — Fase 2 HECHA (2026-06)
- **`src/lib/meta.ts`** sumó: `publicarVideoFacebook({pageId,token,videoUrl,caption})` → `POST
  /{pageId}/videos` con `file_url` (Meta baja el MP4 público) + `description`; `publicarReelInstagram(
  {igUserId,token,videoUrl,caption})` → `POST /media` (media_type=REELS) → **poll** `status_code` hasta
  FINISHED (hasta ~90s) → `POST /media_publish` → permalink best-effort. Helper `postJson` + `sleep`.
- **`src/server/despachador.ts`**: `publicarUna(pubId)` (carga la social_publication + su cuenta,
  descifra el token, publica según plataforma, marca `publicada` con url/externalId o `error`;
  idempotente si ya está publicada); `despachar()` (toma `en_cola` con `programadaEn<=now`, publica
  hasta 20); `publicarYa(pubId)` (botón). TikTok devuelve error "todavía no".
- **`app/api/cron/despachar/route.ts`** (GET → `despachar`): para un cron externo en prod; con
  `CRON_SECRET` pide `?key=`, en dev queda abierto.
- **UI** `publicaciones-board.tsx`: botón **"Despachar pendientes (N)"** en el header + por fila
  **"Publicar ahora"** (en_cola) / **"Reintentar"** (error) + Toast.
- El video sale del render (`social_publications.videoUrl` = output público del worker). El bucket
  `videos` es público en dev → Meta puede bajarlo.
- **PENDIENTE Fase 2**: despacho automático real (hoy es manual/botón o cron externo; falta cron en
  prod), refresh de tokens largos (~60d), y TikTok.

### WORKER RECONSTRUIDO (2026-06) — todos los cambios pendientes ya están vivos
- Se reconstruyó la imagen `scrapify-worker` y se recreó el contenedor `zoo-worker`
  (`--restart unless-stopped --env-file sample/worker.env`, sin puertos). Logs confirman:
  "cola de render iniciada" + "retención de originales activa (TTL 14d)" + "escuchando en :8080".
- Con esto quedaron **activos en el render**: margen del zócalo (`zocaloMargen`), fix del degradado
  (2 capas), marco/margen del video, paths nuevos por cliente/mes + nombres legibles, y la retención
  de originales. (Antes el contenedor corría imagen vieja → el render no reflejaba el preview.)
- **Síntoma que lo disparó**: zócalo con margen del borde 16% se veía bien en el preview pero **abajo
  en el render** → era la imagen vieja del worker.
- Comandos de rebuild (para repetir): `docker build -t scrapify-worker apps/worker` →
  `docker stop/rm zoo-worker` → `docker run -d --name zoo-worker --restart unless-stopped
  --env-file sample/worker.env scrapify-worker`. (Capas pesadas —ffmpeg/npm/Chromium— quedan cacheadas;
  solo recompila `src`, ~20s.)
- **Fix Server Actions (2026-06)**: `apps/social/next.config.ts` → `experimental.serverActions.
  bodySizeLimit: "8mb"` (el render manda la config con el logo embebido como data URL; 1 MB se quedaba
  corto). Requirió reiniciar el dev server. Mejora futura opcional: achicar el logo en el cliente.

### PUBLICACIÓN REAL VERIFICADA end-to-end (2026-06) ✅
- Se publicó un mismo video a **Facebook (Página Zoocial)** y a **Instagram (Reel)** con éxito, sin
  errores. URLs reales: FB `facebook.com/2196235624547222`, IG `instagram.com/reel/DaJgBp2Dyxt/`.
  Confirma OAuth + token + cifrado + `publicarVideoFacebook` + `publicarReelInstagram` (container→poll
  FINISHED→publish) de punta a punta. El IG del usuario quedó bien configurado (Reel publicado).
- **Causa del "no las veo"**: las publicaciones quedaban en **`en_cola`** y **nunca se despachaban**
  (no hay despacho automático corriendo). Se dispararon con `GET /api/cron/despachar` → `{publicadas:2}`.
- **`proxy.ts`**: ahora deja pasar `/api/cron/*` sin sesión (lo llama un cron externo; se protege con
  CRON_SECRET). El resto sigue detrás del login.
- **Producción**: el auto-despacho ya está listo a nivel código (endpoint `/api/cron/despachar`); solo
  falta **configurar un cron** que lo pegue cada 1 min al deployar.
- **Auto-despacho — HECHO (2026-06)**: dos mecanismos.
  1. **En el panel**: toggle "Auto ON/OFF" en /publicaciones (setInterval 60s → `despachar()`, persistido
     en localStorage). Sirve sólo con el panel abierto.
  2. **24/7 sin navegador (el bueno)**: el **worker** (siempre on) le pega cada 60s al endpoint
     `/api/cron/despachar`. `apps/worker/src/despacho.ts` `iniciarDespacho()` (lee `DISPATCH_URL`,
     guard `corriendo`, 1ª pasada a los 15s) arrancado en server.ts. `worker.env` →
     `DISPATCH_URL=http://host.docker.internal:5556/api/cron/despachar` (dev). **Verificado**: el
     contenedor alcanza el panel del host (`{"publicadas":0}`). En prod = URL pública del panel + `?key=CRON_SECRET`.
- **Doble-publicación evitada (claim atómico)**: con dos despachadores (worker + panel) había riesgo de
  publicar 2 veces el mismo ítem (sobre todo IG, que tarda ~90s). Fix: enum `social_publication_status`
  suma **`publicando`** (migración **0024**, BEFORE 'publicada'). `publicarUna` ahora hace un UPDATE
  atómico a `publicando` WHERE estado IN (en_cola,error,pendiente) RETURNING; si no devuelve fila, otro
  ya lo tomó → no repite. Tipo `EstadoPub` + board (badge "Publicando…" warning) + dashboard actualizados.
- **CAUSA del "no se dispararon"**: el toggle del panel sólo corre con el navegador abierto y estaba
  OFF/cerrado. Ahora el worker lo hace solo. **OJO dev**: el worker pega al **Next dev server** (debe
  estar corriendo). Edge conocido: un ítem que quede en `publicando` por crash del worker no se
  reintenta solo (recuperación pendiente si pasa).

### Confirmaciones lindas + borrado en cascada del cliente (2026-06) — HECHO
- Se reemplazaron TODOS los `window.confirm` del panel por modales del design system (`Modal` +
  Button `variant="danger"`): **Clientes** (clientes-board) y **Cuentas** (cuentas-board). Renders ya
  tenía su modal propio. No quedan alerts del navegador en apps/social.
- **`eliminarCliente`** (server/clientes.ts) ahora borra **todo el contenido del cliente**: junta los
  archivos de Storage de sus renders (sourcePath, outputPath, thumb derivado de thumbnailUrl con
  `pathDeUrl`), los borra del bucket `videos` (service role, en lotes de 100, best-effort), borra las
  filas `video_renders` (su FK era set null) y borra el cliente → cascada de `social_accounts` y
  `social_publications`. Irreversible; el modal lo advierte. revalida /clientes /renders /publicaciones.

### Estudio: Destino arriba + tipografía en dropdown (2026-06) — HECHO
- **Destino movido al TOPE del inspector derecho** (antes estaba al fondo y quedaba oculto con scroll →
  el usuario rendereó/publicó a un cliente equivocado sin querer). Va en un recuadro resaltado
  (border-accent/bg-accent) para que no se pase por alto.
- **Tipografía**: la grilla de 8 botones de fuente pasó a un **`<select>` nativo** ("Tipografía"). Se
  usó select nativo (no popover custom) para que NO se corte dentro del rail con `overflow-y-auto`. El
  trigger y las opciones muestran cada nombre en su propia fuente.

### Módulo de Usuarios (2026-06) — HECHO
- Pantalla **/usuarios** (nav "Usuarios", icono UserCog). Gestiona los **usuarios de Supabase Auth**
  (los que pueden loguear), no la tabla `users`. `src/server/usuarios.ts` (admin API con service role):
  `listarUsuarios` (auth.admin.listUsers, lee nombre/rol/area de `user_metadata`), `crearUsuario`
  (createUser con `email_confirm:true` → entra sin verificar mail; pass ≥8), `actualizarUsuario`
  (updateUserById metadata: nombre/rol/area), `eliminarUsuario` (deleteUser).
- `components/usuarios/usuarios-board.tsx`: lista (avatar, nombre/email, último acceso, badges rol/área),
  alta/edición en modal (email solo al crear, password texto plano para pasársela, rol admin|moderador,
  área ambos|redes|noticias), borrado con modal de confirmación. Marca al usuario actual ("vos") y
  **no deja auto-eliminarse**. rol/area se guardan en `user_metadata` (no en la tabla `users`).
- **PENDIENTE**: gatear la página solo para `rol=admin` (hoy entra cualquier logueado) — va junto con
  el gate por `area` que también está pendiente. El admin sembrado (narese@gmail.com) no tiene metadata
  rol/area todavía; se le puede setear editándolo desde la propia pantalla.

### Deploy a la nube (2026-06) — EN CURSO
- **Rama `redes` pusheada a GitHub** (`github.com/javiernarese2000/scrafity`, 47 archivos, sin secretos:
  `.env*` y `apps/worker/sample/` ignorados; verificado). `main` (Noticias en Railway) intacto.
- **`DEPLOY.md`** (raíz) = runbook: 2 servicios Railway desde el mismo repo, rama `redes`.
  - Worker: Root `apps/worker` (Dockerfile). Vars: DATABASE_URL(pooler), NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY, DISPATCH_URL(=panel/api/cron/despachar?key=CRON_SECRET).
  - Panel: Root = raíz repo. Build `pnpm install --frozen-lockfile && pnpm --filter @scrapify/social build`,
    Start `pnpm --filter @scrapify/social start`. Vars: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, ENCRYPTION_KEY, META_APP_ID/SECRET, META_REDIRECT_URI,
    CRON_SECRET.
  - Para el TEST: reusar el Supabase DEV (free); pasar a Pro en producción real.
- **Falta (lo hace el usuario en Railway/Meta)**: resetear App Secret de Meta, crear los 2 servicios,
  pegar vars (valores del `.env` local), setear redirect URI de prod + reconectar Meta, completar
  DISPATCH_URL. App Review de Meta = para clientes reales (después).
- **Config fix (2026-06)**: había un `railway.json` en la RAÍZ apuntando a Noticias (DOCKERFILE
  `Dockerfile` + start `@scrapify/web`) → el servicio nuevo construía Noticias. Fix en rama `redes`:
  nuevo **`Dockerfile.social`** + `railway.json` → `Dockerfile.social` + start `@scrapify/social`
  (NEXT_PUBLIC del Supabase DEV como build-args). El servicio panel redeploya solo con la app correcta.
  Worker = servicio aparte con Root Directory `apps/worker` (su propio Dockerfile, no lee el railway.json
  raíz). **OJO**: antes de mergear redes→main, separar config por servicio para no romper Noticias.
  Proyecto Railway del test: "passionate-kindness" (trial). El usuario se mareó con la UI; se resolvió
  desde el código (config-as-code) para minimizar clics.
- **Variables prod (panel)**: 10 cargadas (las 9 + DIRECT_URL que agregó Railway). DATABASE_URL=pooler.
  META_REDIRECT_URI=`https://<dominio>/api/meta/callback`. CRON_SECRET generado. OJO: en Railway las
  variables quedan **staged**; hay que apretar **"Apply N changes / Deploy"** (no "Redeploy") para que
  el contenedor las tome (síntoma: "DATABASE_URL no está definida" en Deploy Logs).
- **Dominio público**: `scrapifyweb-production.up.railway.app` (editable a `zoocial.up.railway.app` desde
  Networking → Public Networking; si se cambia, actualizar META_REDIRECT_URI).
- **Watch Paths**: hay un filtro que saltea deploys ("No changes to watched files"); si un push no
  redeploya, apretar Deploy a mano (o limpiar el watch path).

### Dashboard: saludo + tips + menú usuario (2026-06) — HECHO
- Nav "Panel" → **"Dashboard"** (también el título del topbar). `app/page.tsx`: header con **saludo por
  hora + primer nombre** (de `user_metadata.nombre` o del email). **`components/dashboard/tips-card.tsx`**
  (cliente, framer-motion): tips que rotan cada 6.5s con puntitos. `user-menu.tsx`: dropdown con **nombre**
  arriba + **email más chico** (sin "Sesión iniciada"); avatar con iniciales del nombre.

### Gate de roles — Usuarios solo-admin (2026-06) — HECHO
- `src/lib/roles.ts`: `rolDeUsuario`/`esAdmin`. Regla: **admin salvo `user_metadata.rol === "moderador"`**
  (evita lockout de usuarios viejos sin metadata; los moderadores creados a propósito sí quedan limitados).
- `nav.ts`: NavItem con `adminOnly`; Usuarios marcado adminOnly. `sidebar.tsx` filtra (`isAdmin` prop).
  `app-shell.tsx` recibe `isAdmin` y lo pasa a los dos sidebars. `layout.tsx` (ahora async) hace
  `getUser()` → `esAdmin` → AppShell. `/usuarios/page.tsx` **redirige a `/` si no es admin** (gate real,
  no solo ocultar el menú). `listarUsuarios` también default missing→admin para que el badge sea consistente.
- Nuevos usuarios se crean como **moderador** por defecto (no ven Usuarios). El admin se setea explícito.
- PENDIENTE relacionado: gate por `area` (que un user de "solo redes" no vea cosas de noticias y viceversa)
  cuando se unifique; y un **panel de logs/auditoría** solo-admin (PROPUESTO, ver abajo).

### Panel de Auditoría / Logs (2026-06) — HECHO
- Tabla **`social_audit_log`** (migración **0025**; OJO: ya existía `audit_log` de Noticias con otra
  forma → la de Redes se llama `social_audit_log`). Campos: actorId/actorEmail/actorNombre (denormalizado),
  accion (namespaced), entidad/entidadId, resumen, meta jsonb, resultado ok|error, error, createdAt + index.
- `src/lib/auditoria.ts` `registrar(evento)`: nunca lanza; toma el actor de la sesión (createClient server
  → getUser) o "Sistema" si no hay (worker/cron). `src/server/auditoria.ts`: `listarAuditoria` (últimos 500
  desc) + `registrarLogin` (la llama el login).
- **Instrumentado**: login (auth.login), render.crear (encolarRender), publicacion.armar (publicarRender),
  publicacion.publicar ok/error (despachador publicarUna/falla — actor "Sistema" si lo despacha el worker),
  cliente.crear/editar/eliminar, cuenta.agregar/conectar(Meta)/eliminar, usuario.crear/editar/eliminar.
- Pantalla **/auditoria** (nav "Auditoría", icono ScrollText, **adminOnly** + gate server-side):
  `components/auditoria/auditoria-board.tsx`. Timeline agrupado por día (Hoy/Ayer/fecha), ícono+color por
  categoría (publicacion=verde, render=accent, cliente=warning, cuenta/auth=info, usuario=accent; error=rojo),
  KPIs (acciones/publicaciones/errores/usuarios hoy), filtros (buscar, categoría, usuario, "solo errores"),
  filas expandibles (cuándo exacto, acción, id, error, meta JSON), auto-refresh 15s, export CSV.

2. Despachador: cron/worker que tome publicaciones `en_cola` con `programadaEn<=now` y publique (depende
   del OAuth Meta/TikTok — tarea externa del usuario).
3. Reiniciar dev servers para el pooler. Limpiar renders de prueba con el botón Eliminar.

### Panel de Tendencias (2026-06) — HECHO
- **/tendencias** (nav "Tendencias", icono TrendingUp, junto al Dashboard; visible para todos).
  Trae **tendencias de búsqueda reales en vivo** de **Google Trends RSS** (`trends.google.com/trending/
  rss?geo=XX`) — gratis, sin API key ni auth. Funciona desde server. (IG/FB no tienen API de "trending
  en vivo"; Google Trends es la señal real/gratis. TikTok Creative Center = otra opción a futuro.)
- `src/server/tendencias.ts` ("use server", solo `getTendencias(geo)`: fetch + parse del RSS con regex —
  término, approx_traffic→número, imagen, noticia relacionada title/url/source). `src/lib/tendencias.ts`
  (NO use-server): tipos + `REGIONES` (AR/MX/ES/CL/CO/US). **OJO regla Next**: un archivo "use server"
  solo puede exportar funciones async → constantes/tipos van en lib aparte (esto rompió el build 1ª vez).
- `components/tendencias/tendencias-board.tsx`: UI animada (framer-motion) — podio top-3 con badges
  gradiente (oro/plata/bronce) + llama, **barras de volumen que crecen**, **count-up** del número de
  búsquedas, noticia relacionada (fuente+titular linkeado), miniatura, CTA "Crear video"→/estudio.
  Selector de región (chips con bandera), badge "en vivo", botón Actualizar.

### Conexión + publicación a TikTok (2026-06) — HECHO (código)
- Credenciales en `.env`: TIKTOK_CLIENT_KEY/SECRET + TIKTOK_REDIRECT_URI (=Railway, no localhost — TikTok
  exige URL registrada; se conecta desde el panel deployado). El usuario debe agregarlas a Railway.
- `src/lib/tiktok.ts`: authUrl (Login Kit v2), exchangeCode/refreshToken (`/v2/oauth/token/`), getUserInfo,
  **subirVideoTikTok** (Content Posting API, scope `video.upload` → inbox/BORRADORES, FILE_UPLOAD un chunk
  ≤64MB; PULL_FROM_URL no se usa porque requiere verificar dominio). Tipo TikTokCreds {a,r,exp}.
- `src/server/tiktok.ts` `conectarTikTok` (upsert social_accounts plataforma=tiktok, externalId=open_id,
  tokens access+refresh cifrados como JSON). `api/tiktok/login`+`callback` (state+cookie CSRF, igual que Meta).
- Despachador `publicarUna`: rama tiktok → `accesoTikTok` (refresca+persiste si el access venció ~24h) →
  `subirVideoTikTok`. Queda como "publicada" pero es **borrador** (urlPublicada=null); el usuario finaliza
  en la app de TikTok. El caption NO va (lo pone la persona en la app, limitación de video.upload).
- UI: botón **"TikTok"** (negro) en /cuentas + toast `?tt=ok|error`. Botón Meta renombrado a "Meta".
- **Páginas legales** públicas `/terms` y `/privacy` (LegalPage, sin login/shell; proxy las deja pasar) →
  para los formularios de Meta/TikTok. URLs: zoocial.up.railway.app/terms y /privacy.
- **PENDIENTE usuario**: (1) agregar las 3 vars TikTok a Railway + Deploy; (2) en la app TikTok: Login Kit
  Configure for Web + redirect URI, y **agregar su cuenta como Target User (sandbox)** para autorizar la app
  sin auditar; (3) la **auditoría** de TikTok para publicar PÚBLICO (Direct Post) — hasta entonces, borradores.

### Worker deployado en Railway (2026-06) — HECHO ✅
- Servicio "scrafity" (worker) en el proyecto Railway passionate-kindness, Online. Root Directory
  `apps/worker`, branch `redes`, su propio `apps/worker/railway.json` (Dockerfile del worker).
- **Bug del deploy**: el `railway.json` de la RAÍZ (Dockerfile.social) se aplicaba a TODOS los servicios →
  el worker intentaba buildear Dockerfile.social y fallaba ("pnpm-lock.yaml absent" con context=apps/worker).
  Fix: `apps/worker/railway.json` propio (builder DOCKERFILE, dockerfilePath `apps/worker/Dockerfile`).
  OJO: el "Config File Path" debe ser el **.json**, no el Dockerfile (el usuario puso el Dockerfile y dio
  "invalid config-as-code file extension"). Con Root Directory=apps/worker, Railway autodetecta el railway.json.
- Vars del worker: DATABASE_URL (pooler IPv4), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
  DISPATCH_URL=`https://zoocial.up.railway.app/api/cron/despachar?key=<CRON_SECRET>`.
- **El producto Redes ya es autónomo de la máquina del usuario** (panel + worker en la nube). Falta:
  apagar el `zoo-worker` local; auditorías Meta/TikTok (público/clientes); Supabase Pro (prod real).
