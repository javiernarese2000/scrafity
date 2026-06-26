# Índice de memoria — Scrapify

> Nombre del producto: **Scrapify**. (La carpeta del repo es `Scrafity` por un typo previo.)

Estado del proyecto y decisiones. Leer esto primero al retomar contexto.

- [`01-vision-y-alcance.md`](01-vision-y-alcance.md) — qué es Scrafity y qué hace.
- [`02-stack-tecnologico.md`](02-stack-tecnologico.md) — stack elegido y por qué.
- [`03-arquitectura-y-flujo.md`](03-arquitectura-y-flujo.md) — flujo de datos, jobs, estados.
- [`04-modelo-de-datos.md`](04-modelo-de-datos.md) — esquema de base de datos (borrador).
- [`05-ux-premium.md`](05-ux-premium.md) — lineamientos de UX/UI premium interactiva.
- [`06-robustez.md`](06-robustez.md) — ideas para robustez (legal, operación, producto).
- [`07-fases-y-pendientes.md`](07-fases-y-pendientes.md) — roadmap por fases y qué falta.
- [`08-scaffold.md`](08-scaffold.md) — estructura del monorepo, versiones y quirks descubiertos.
- [`09-redes-multiapp.md`](09-redes-multiapp.md) — 2º panel (Redes/video), multi-app, entorno DEV. **EN CURSO (rama `redes`)**.

## Estado actual
**Fase:** Fase 1 — UI en construcción (con datos mock; backend desconectado a propósito).
Hecho: scaffold + Supabase (8 tablas) + **app shell** (sidebar, topbar, tema claro/oscuro)
+ **Dashboard** (KPIs, gráficos SVG animados, salud de fuentes, actividad)
+ **Cola de moderación** (maestro-detalle, tabs de versiones, diff real por palabras vs
  original, indicador de similitud, acciones aprobar/editar/rechazar, toast) + stubs de rutas.
+ **Pegar URL** (extracción mock + config + destinos) + **Fuentes** (toggle activar/pausar)
+ **Destinos** (lista WP/propios). Kit propio + Framer Motion; refinamiento aplicado.
+ **editor inline** en moderación + **Auth (Supabase) funcionando** (login, proxy, menú de
usuario, seed). **Fuentes y Destinos** contra la DB real. **Pegar URL → extracción real (Readability/linkedom,
keyless) → generación con Claude → guarda en DB**, y **Moderación lee de la DB** (aprobar/
rechazar/editar persisten; al aprobar se descartan las hermanas). API key de Claude cargada en
`.env`. **Biblioteca** (`/biblioteca`): grilla de cards con filtros por estado (en revisión/aprobada/
publicada/archivada), búsqueda, archivar/desarchivar y detalle (`/biblioteca/[id]`) con render
Markdown, editor de tags (IA sugiere + manual) y ver original. **Escenarios** (`/escenarios`): canvas interactivo (React Flow) — nodos Fuente/Escenario/Destino,
conexiones arrastrables animadas que se persisten, panel de config del escenario (tema, Nº
versiones, tono, proveedor, cupo, moderación, activo), drag con posiciones guardadas. FASE 1
(editor visual; el motor que ejecuta el grafo es fase 2). Falta: pantalla Ajustes (al final),
Firecrawl, DeepSeek key, Dashboard real, **motor de escenarios (ejecución)** y **publicación a
destinos — el último paso**.
**Última actualización:** 2026-06-21.

## Imágenes + Biblioteca workspace (2026-06)
- **Storage**: bucket público `imagenes` (Supabase). `src/server/imagenes.ts` (subir/portada/quitar),
  galería por nota (`articles.imagenes`, migración 0005). Componente `Galeria` en el detalle.
- **Biblioteca = workspace**: el detalle muestra **todas las versiones lado a lado** y tiene
  **Publicar / Republicar** (mismo diálogo que Moderación). Resuelve los 2 bugs (ver las N
  versiones, republicar).
- **Portada por destino**: `publications.imagen_url` (migración 0006); el diálogo de publicar
  permite elegir versión Y portada por cada diario. El feed usa esa portada (fallback a la de la nota).
- `publicar()` corregido: al publicar, solo descarta borradores **en revisión**; no pisa versiones
  ya publicadas (clave para republicar).
- **Multimedia** (biblioteca global) — HECHO (2026-06): tabla `media` (url, path, nombre, tags[],
  migración 0013) en el bucket `imagenes` (carpeta `media/`). `src/server/media.ts`: subirMedia
  (con tags), buscarMedia (por nombre o tag, SQL unnest ilike), setTagsMedia, eliminarMedia.
  Página **/multimedia** (nav, icono Images): grilla + búsqueda + subir con tags + editar tags + borrar.
  **MediaPicker** (`components/media/media-picker.tsx`): modal con **buscador** (ej. "messi") + subir,
  reusable. Integrado en la **galería de la nota** (botón "Biblioteca") → `usarEnNota(articleId,url)`
  setea portada + suma a la galería. Badge sin cambios.

## Publicación (Paso B) — parcial (2026-06)
- Moderación: el botón pasa a **"Publicar…"** → diálogo para elegir **destinos** y **versión por
  destino** (modelo mixto). Crea filas en `publications` (`src/server/publicar.ts`).
- **Sitios propios**: publicación queda `publicada` y se sirve por **feed público**
  `GET /api/feed/[destinoId]` (sin auth; excluido en `proxy.ts`). Verificado.
- **WordPress de clientes**: CONECTOR LISTO (2026-06). `src/server/wordpress.ts` publica vía
  REST API (`/wp-json/wp/v2/posts`, status `publish`) con **Application Passwords** (Basic Auth).
  Markdown→HTML con `marked`; sube la portada a `/wp/v2/media` y la asigna como `featured_media`
  (si falla la imagen, publica igual). Credenciales **cifradas AES-256-GCM** (`src/lib/crypto.ts`,
  clave en `.env` `ENCRYPTION_KEY`, nunca en repo) guardadas en `destinations.credencialesCifradas`.
  Alta de destino WP pide usuario + app-password con botón **"Probar conexión"** (`/wp/v2/users/me`).
  `publicar()` empuja a WP: queda `publicada` (con `urlPublicada`/`externalId`) o `error` (con detalle,
  reintentable desde Biblioteca); usa `onConflictDoUpdate` para permitir reintentos.
- Al publicar, las versiones elegidas → `publicada`, el resto → `rechazada` (sale de la cola).
- VERIFICADO end-to-end contra un WordPress real (2026-06): demo en HTTP con
  `WP_ENVIRONMENT_TYPE='local'` (App Passwords exige HTTPS salvo entorno local). Posts crean OK.
  Nota: HTTP plano = Basic Auth en texto → en producción el WP del cliente debe ser HTTPS.
- **Gotchas resueltos en la puesta a punto (clave para el próximo WP):**
  1. App Passwords exige HTTPS → para demo: `define('WP_ENVIRONMENT_TYPE','local')` en wp-config.php.
  2. Apache borra la cabecera `Authorization` → agregar en `.htaccess` la regla
     `RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]` (WP ya la inserta en su bloque).
     Diagnóstico definitivo: un `.php` que vuelca `$_SERVER` y ver si llega `PHP_AUTH_USER`.
  3. El "usuario" de Basic Auth es el **user_login** (no el email).
  4. La contraseña debe ser una **Application Password** (`xxxx xxxx ...`), NO la clave de la cuenta.
  5. "Probar conexión" (`/users/me`) valida login pero NO el permiso de publicar; mejorado para
     avisar si el rol no puede publicar (chequea `capabilities.publish_posts` con context=edit).
- **Enriquecimiento del post (2026-06):** el conector manda `excerpt` (primer párrafo limpio,
  ≤300 chars) e inserta `<!--more-->` tras el primer párrafo. **Categorías:** se eligen al publicar
  (el diálogo trae las categorías reales del WP vía `/wp/v2/categories`, carga lazy por destino);
  se mandan por ID en `categories`. **Tags:** los tags de la nota se resuelven/crean como etiquetas
  de WP (`/wp/v2/tags`, buscar o crear; si una falla no frena). `Asignacion` ahora lleva `categoriaId`.
- `publicar()` devuelve `ResultadoPublicacion {publicadas, errores[]}`; el toast muestra el resultado
  real (antes mentía). Una versión cuyo push a WP falla queda reintentable (no se marca publicada).
- Falta: ingesta automática (Paso C).

## Dashboard real + Pulso (2026-06)
Reemplazado el dashboard mock por datos reales (`app/page.tsx`, server, force-dynamic):
- **KPIs reales**: ingestadas hoy, en curaduría, en moderación, en cola, publicadas hoy.
- **Pulso** (`components/dashboard/pulso.tsx`): rescatado de `vox-nebula` (proyecto del usuario en
  C:/Work/Testing/vox-nebula, monitor 3D de noticias). Timeline de 2 carriles **Entrada (ingesta)** vs
  **Salida (publicaciones)**, barritas por hora (24 buckets) coloreadas por categoría, con leyenda +
  contadores. Es DOM+framer-motion (sin Three.js). Color por categoría: `lib/categorias.ts`
  `colorCategoria` (map fijo de categorías comunes a `--color-viz-*` + hash estable para el resto).
- **Versiones por estado** (donut real) + **Salud de fuentes** (real, desde `sources`).
- vox-nebula: queda pendiente/opcional el **Hero 3D** (core/red neuronal R3F) — pesado (Three.js),
  habría que recolorear a tokens cálidos. Rescatado solo lo liviano (pulso/leyenda).
- **En vivo**: `components/dashboard/auto-refresh.tsx` (router.refresh cada 20s). Las fichas del pulso
  **caen desde arriba** (framer y:-16→0); como el refresh es soft, solo se animan las nuevas.
- **Mejoras de diseño (2026-06)**: MetricCard con **icono** (cuadrado suave, color por métrica) +
  **sparkline** (`charts/sparkline.tsx`) en ingestadas/publicadas. Pulso más **alto** (SEG5/MAXSEG26)
  con **líneas verticales** por hora (cada 2h) + fondo de dots. Nuevo **panel Escenarios** (activos/total,
  auto-publican, lista + botón "Abrir Escenarios"). Badge ganó tono `info`. Token `--color-info` ya existía.

## Decisiones tomadas (resumen)
- Lenguaje: **TypeScript full-stack** (Next.js + Node, monorepo).
- IA: **multi-proveedor** — DeepSeek (volumen/barato) + Claude (calidad). Con fallback.
- **Tenancy**: plataforma **solo interna** (nuestro equipo). Sin login de clientes en Scrapify.
- Destinos: **sitios propios** (headless, consumen vía API/feed, sin admin) + **sitios de
  clientes** (WordPress vía REST API, credenciales por sitio).
- Ingesta: RSS + APIs de noticias + scraping de URLs (Firecrawl al inicio).
- Jobs en background: **Inngest**.
- Flujo: toda nota pasa por **moderación humana** antes de publicar.
- Versiones por nota: **configurables** al pegar la URL (cantidad, tono, proveedor, destinos).
- Volumen inicial: **50–150 notas/día**.
- UX: **premium, editorial, muy interactiva** (prioridad explícita). Tonos suaves, muchos
  gráficos, mucho detalle, paleta muy cuidada.
