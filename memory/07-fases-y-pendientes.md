# Fases y pendientes — Scrapify

## Roadmap por fases (no construir todo de una)

### Fase 1 — MVP
- Scaffold monorepo (pnpm + Turborepo) + Next.js + Drizzle + Inngest.
- Pegar URL → Firecrawl extrae → genera N versiones (DeepSeek) → moderación → publicar a 1 WordPress.
- Auth básica (admin/moderador).
- UX premium en las pantallas: crear nota + cola de moderación.

### Fase 2 — Agregación
- Conectar RSS + APIs de noticias.
- Monitor de salud de fuentes (cron).
- Detección de duplicados en ingesta.
- Soporte multi-proveedor IA completo (Claude + fallback).

### Fase 3 — Escala y producto
- CMS propio + multi-destino.
- Score de similitud vs original (anti-plagio).
- Dashboard de costos de IA.
- Programación de publicación, plantillas de prompt, tagging automático.

## Decisiones abiertas / a confirmar con el usuario
- ~~Multi-tenant~~ → RESUELTO: plataforma interna; destinos = sitios propios (headless) +
  WordPress de clientes.
- ~~Dirección visual~~ → DEFINIDA: editorial premium, tonos suaves, muchos gráficos, mucha
  interacción y detalle, paleta muy cuidada (ver `05-ux-premium.md`).
- **Política editorial/legal** sobre reescritura de notas de terceros (copyright).
- ~~Neon vs Supabase~~ → RESUELTO: **Supabase** (Postgres + Auth + Storage).
- ~~Better-Auth vs Clerk~~ → RESUELTO: **Supabase Auth** (login interno, sin sign-ups públicos).

## Backlog de features futuros (no desarrollar aún)

### Escenarios (motor de reglas de enrutamiento) — IDEA DEL USUARIO (2026)
Automatizar el flujo con "escenarios": reglas que, cuando una nota cumple ciertas
**condiciones**, disparan un **procesamiento y enrutamiento** definido. Evita configurar
cada nota a mano.

- **Condiciones** (ej.): categoría/tema (ej. "Política"), fuente de origen, palabras clave,
  idioma, score de similitud máximo, rango horario, etc.
- **Acciones / config**: cuántas versiones generar, tono, proveedor de IA, a qué **destinos**
  va (WordPress de clientes / sitios propios), y si **auto-publica** o **requiere moderación**.
- Modelo mental: `SI (tema = Política Y fuente ∈ {...}) ENTONCES generar 3 versiones (tono
  formal, DeepSeek) → destinos {SitioA, ClienteB} → requiere moderación`.
- Conecta las tres patas del sistema (fuentes → procesamiento → destinos) vía reglas.
- Implica nuevas tablas (ej. `scenarios`, `scenario_conditions`, `scenario_actions`) y un
  paso de "evaluación de escenarios" en el pipeline de ingesta/reescritura.
- Requiere **tagging/categorización automática** (ya previsto) para que las condiciones por
  tema funcionen.

### Research Agent (IA + búsqueda web) — IDEA DEL USUARIO (2026)
Agente que investiga en la web y produce contenido con fuentes. Base: Claude trae herramientas
server-side **`web_search` + `web_fetch`** (devuelven citas), en un agentic loop (SDK que ya
usamos). No requiere Tavily/Firecrawl/SerpAPI para investigar. Correr async con Inngest (tarda
minutos). Niveles: (1) enriquecer/fact-check una nota, (2) **nota original desde un tema con
fuentes** (lo más jugoso, más transformador y legalmente más seguro), (3) Managed Agents para
investigaciones largas con stream a la UI. Costos: agentic = más tokens + costo por búsqueda →
usar cupos; Sonnet para volumen, Opus para profundidad.

### Motor de tendencias (trend score) — IDEA DEL USUARIO (2026)
Agente que mira N fuentes, agrupa por tema y puntúa "tendencia" para generar contenido de lo que
explota. Pipeline: ingesta continua (= Paso C) → clustering por tags/keywords (v1) o embeddings →
**trendScore** combinando volumen + velocidad/aceleración + diversidad de fuentes + recencia +
novedad (no repetir lo ya cubierto) → el agente genera para los temas top no cubiertos (con
cupos). Ingesta/scoring barato; lo caro es la generación (controlable). Inspiración: proyecto
"Escalade".

### Procedencia / "verifiable AI execution" — IDEA DEL USUARIO (2026)
Dejar "recibo" de cómo se generó cada contenido (qué nota lo disparó, qué agente/modelo, cuándo).
Niveles, de menos a más: (0) **audit_log** + ya guardamos proveedor/tokens/fecha/artículo (casi
listo); (1) **recibo firmado**: hash de (entrada+salida+modelo+hora) firmado con clave propia →
a prueba de manipulación, sin blockchain; (2) **C2PA / Content Credentials** (estándar de la
industria para procedencia); (3) **anclaje on-chain** (lo de Escalade con 0G Compute) → verificación
descentralizada por terceros. RECOMENDACIÓN: blockchain es over-engineering para MVP; arrancar en
nivel 0–1; on-chain/C2PA solo si la audiencia/marca/regulación lo exige.

### Extracción con fallback (Firecrawl) — DECISIÓN DE DISEÑO (2026-06)
Mismo criterio que la IA (DeepSeek → Claude): la extracción debe tener **Plan B**.
- **Plan A:** extractor keyless (Readability/linkedom) — gratis, cubre la mayoría de las notas.
- **Plan B:** **Firecrawl** — entra SOLO si A falla o devuelve poco/nada de texto (notas
  bloqueadas, render por JS, muros de pago, tablas que se rompen).
- **Disparo automático:** si el cuerpo extraído viene vacío o sospechosamente corto →
  reintentar con Firecrawl. Así no se paga API por cada nota trivial y se cubren las difíciles.
- Implementación futura: módulo `extraer()` enchufable (estrategia A→B) usado tanto por
  "Pegar URL" (manual) como por la ingesta automática (Paso C). Requiere `FIRECRAWL_API_KEY` en `.env`.
- Estado: **decidido, NO implementado** (a pedido del usuario; lo hacemos más adelante).

## Revisión de lógica end-to-end (2026-06) — IMPORTANTE

Repaso crítico de cómo funcionaría en un escenario real. Hallazgos:

**El círculo está ABIERTO.** Hoy funciona el tramo central (Pegar URL → generar con Claude →
moderar), pero faltan las dos puntas:
- **Ingesta automática** (RSS/API): las fuentes se cargan pero nada las lee. Solo "Pegar URL" manual.
- **Publicación**: al aprobar, la versión queda en la DB y muere. No va a WordPress ni a feed.
- **Escenarios NO ejecutan**: el canvas guarda el grafo pero no hay motor que lo use.

**Problemas de coherencia detectados:**
1. Dos "cerebros" que no se hablan: el flujo manual (Pegar URL, con su propia config) y los
   Escenarios (que no corren). 
2. ~~Inngest "enchufado pero apagado"~~ → el job `rewriteArticle` ahora usa el motor compartido y
   hay un cron `ingestSources`. (El flujo manual sigue síncrono a propósito; el cron necesita el
   Inngest Dev Server / Cloud corriendo. Para probar local: botón "Ingestar ahora", síncrono.)
3. Extracción (Readability) es el eslabón débil → producción necesita Firecrawl / fetch autenticado.
4. Falta **dedup en ingesta** (RSS repite ítems; el índice único de `hash` tiraría error sin manejar).
5. `cupoDiario` se configura pero no se aplica; no hay tope de costo real.
6. ~~Credenciales de destino: campo existe pero sin cifrado~~ → RESUELTO (2026-06): cifrado
   AES-256-GCM (`src/lib/crypto.ts`, `ENCRYPTION_KEY`) + conector WordPress REST API
   (`src/server/wordpress.ts`, Application Passwords). Falta probar contra un WP real.

### Curaduría previa a la generación — DECISIÓN DEL USUARIO (2026-06) — IMPLEMENTADO
Problema: la ingesta generaba IA para TODO (gasta tokens + deja entrar basura que no debe publicarse,
ej. "Números de Oro" de La Gaceta). Solución: gate humano BARATO sobre la nota CRUDA antes de gastar IA.
- `articles.curacion` enum (`pendiente|aprobada|descartada`, default 'aprobada') + `articles.escenarioId`
  (migración 0009). La ingesta crea notas `pendiente` SIN generar; el flujo manual (Pegar URL) sigue
  directo (`aprobada`).
- Página **/curaduria** (nav "Curaduría", icono Inbox): lista las crudas `pendiente` con título, fuente,
  → escenario destino, resumen, imagen y link. Aprobar/Descartar individual + **masivo** + seleccionar todo.
- `src/server/curaduria.ts`: `aprobarIngesta` marca `aprobada` y dispara `generarVersionesCore` en
  **segundo plano** (fire-and-forget) con los params del escenario matcheado → cae en Moderación cuando
  termina. `descartarIngesta` marca `descartada` (nunca se genera/publica). Versiones masivas.
- `generarVersionesCore` endurecido: si la generación falla, el `rewrite_job` queda `error` (no colgado).
- Biblioteca filtra `curacion='aprobada'` (no muestra crudas ni descartadas). Cupo ahora cuenta NOTAS
  ingestadas por escenario/día (no jobs). Panel de ingesta: "Nuevas → Curaduría" (ya no "Generadas").
- Recorrido nuevo: Ingesta → Curaduría (humano) → [aprobar] IA genera → Moderación → Publicar.
- NOTA: las notas de la 1ª ingesta (flujo viejo) quedaron `aprobada` con versiones; limpiar a mano
  (archivar/rechazar) si molestan. El gate aplica a ingestas futuras.
- PENDIENTE opcional: palabras de exclusión por fuente/escenario (autodescarte en ingesta).

### Bajar similitud / anti-plagio reforzado — 2026-06 — IMPLEMENTADO
El medidor (`lib/diff.ts`, trigramas) está OK: mide plagio real. El problema era la IA copiando
el cuerpo (cambiaba solo entrada/cierre). Mejoras:
- **Prompt reforzado** (`ai/prompt.ts`): insiste en reescribir TODOS los párrafos (medio incluido),
  reordenar, variar arranques; deja textual solo citas entre comillas + datos + nombres + tablas.
  Param nuevo `refuerzo` para los reintentos. (Cuidado: el archivo tenía acentos que no matcheaban
  con Edit; se reescribió con Write.)
- **Bucle hasta umbral** (`server/generar.ts` `generarUnaVersion`): objetivo ≤40% similitud; si supera,
  regenera con instrucción más dura (hasta 3 intentos, sube temp), se queda con la de MENOR similitud.
- **Botón Regenerar**: en Biblioteca (huérfanas) Y en el detalle de la nota (al lado de Publicar).
  `regenerar()` (curaduria.ts) descarta los borradores `en_revision` (los reemplaza), no toca publicadas,
  y regenera en segundo plano con los params del escenario. Sirve para reprocesar notas con % alto.
- Costo: hasta 3 generaciones por versión (corta al bajar de 40%); con throttle+backoff no rompe rate limit.

### Robustez de generación (rate limit) — 2026-06 — IMPLEMENTADO
Problema detectado: aprobar varias notas en Curaduría disparaba generaciones EN PARALELO →
429 rate_limit de Claude (tier bajo: 8.000 output tokens/min) → notas quedaban `aprobada` SIN
versiones (huérfanas). Además DeepSeek no respalda porque `DEEPSEEK_API_KEY` está vacía.
- **Throttle**: `aprobarVarias`/`aprobarIngesta` (curaduria.ts) marcan `aprobada` al instante y
  generan **de a una** en segundo plano (`generarSecuencial`, concurrencia 1).
- **Retry/backoff 429**: `generate()` (ai/index.ts) reintenta el mismo proveedor ante rate limit
  (esperas 2s/5s/10s) antes de pasar al siguiente.
- **Regenerar huérfanas**: acción `regenerar(articleId)` (curaduria.ts) + botón en Biblioteca.
  Biblioteca ahora marca el estado de generación: nota con 0 versiones y último job `error` →
  badge **"Generación falló" + Regenerar**; job `generando/pendiente` → "Generando…". (Antes
  `deriveEstado` mostraba las huérfanas como "Rechazada", confuso.) Se calcula desde el último
  `rewrite_job` por nota.
- RECORDATORIO: cargar `DEEPSEEK_API_KEY` o subir tier de Claude para volumen real.

### Ciclo de vida de notas: papelera + retención (TTL) — 2026-06 — IMPLEMENTADO
Preocupación del usuario: miles de notas a futuro. Decisiones: TTL borra solo lo descartable a los
60 días; nunca archivadas ni publicadas; borrado manual a papelera recuperable.
- `articles.deletedAt` (migración 0010, soft delete). Papelera = deletedAt != null.
- Acciones (biblioteca.ts): `eliminarNota` (soft), `restaurarNota`, `eliminarDefinitivo` (hard,
  cascada), `vaciarPapelera`, `limpiarAhora` (corre retención manual).
- `retencion.ts` `aplicarRetencion()`: (1) descartable viejo (>60d, no archivada, sin versión
  publicada/aprobada) → papelera; (2) papelera vieja (>14d) → borrado definitivo. Cron Inngest
  `retencion` (`0 4 * * *`) + evento + botón "Ejecutar limpieza" en Papelera.
- Página **/papelera** (nav, icono Trash2): restaurar / eliminar definitivo / vaciar. Botón
  eliminar (a papelera) en cards de Biblioteca y en el detalle.
- Filtro `isNull(deletedAt)` agregado en: biblioteca, moderación, curaduría y el **feed** (no sirve
  notas borradas).
- PENDIENTE (lo planteé, queda para otro paso): **escalabilidad de Biblioteca** — hoy carga TODO
  (todas las notas + TODAS las versiones de la tabla) en memoria; con miles se pone lento. Falta
  paginación + búsqueda/filtros en DB + no traer versiones completas para el listado.

### Bandeja de salida + despachador (auto-publicación con ritmo) — 2026-06 — FASE 1 HECHA
Buffer entre "nota lista" y "publicada" para no publicar cualquier cosa al toque. Decisiones del
usuario: "Publicar ahora" y cola CONVIVEN; reparto equilibrado/random + prioridad manual; ritmo POR
destino. Recorrido: …Moderación → [Enviar a la cola] → despachador suelta con ritmo → WP/feed.
- Schema (migración 0011): `publication_status` +`en_cola`; `publications.categoria` (1er tag) +
  `publications.prioridad`; `destinations.cadencia` jsonb (`Cadencia`: cantidad, cadaMinutos,
  franjaInicio, franjaFin, modo 'equilibrado'|'random', activo).
- `src/server/cola.ts` (use server): `enviarACola` (crea publications `en_cola`, versión→aprobada,
  hermanas en_revision→rechazada), `publicarYa`, `quitarDeCola`, `setPrioridad`, `despacharAhora`,
  `guardarCadencia`.
- `src/server/despachador.ts`: `publicarItem(pubId)` (publica 1 a WP/feed, versión→publicada) +
  `despachar()` (por destino con cadencia activa y dentro de franja: cuenta publicadas en la ventana
  `cadaMinutos`, libera hasta `cantidad`; `elegir()` = prioritarios primero, luego equilibrado
  round-robin por categoría o random). Cron Inngest `despachar-cola` `*/10` + evento + botón.
- UI: página **/bandeja** (nav "Bandeja de salida", icono SendHorizontal): tabs por destino, form de
  ritmo editable, métricas, **kanban por categoría** con cards (prioridad★ / publicar ya / sacar),
  "Despachar ahora". `PublishDialog` ahora tiene 2 botones: "Publicar ahora" y "Enviar a la cola"
  (cableado en Moderación y Biblioteca).
- Bug resuelto (2026-06): el `PublishDialog` no reseteaba selección entre notas → encolaba/publicaba
  la versión de la nota anterior y rechazaba las de la actual (la nota "desaparecía"). Fix: reset de
  `sel` al abrir (`useEffect [open, defaultVersionId]`) + seguro en `enviarACola`/`publicar` (ignoran
  asignaciones con versionId ajeno; si ninguna válida, no tocan nada).
- Actividad/auditoría (2026-06): la bandeja ahora muestra **"Actividad reciente"** por destino
  (publicadas + errores, con link al post, categoría, hora) + conteo por categoría. Resuelve la
  confusión de "se publicaron y no las veía" (la bandeja solo lista `en_cola`). El ✈️ "publicar ya"
  pide confirmación. (Las publicaciones se verificaron OK en el WP demo: 13 posts con URL.)
- Categoría unificada (2026-06): antes había DOS conceptos (tags[0] interno para el kanban + selector
  de categoría WP en el modal, que además se ignoraba al encolar). Ahora: **una sola categoría por
  nota**, `articles.categoria` (migración 0012), la sugiere la IA (`generar.ts` setea =tags[0]),
  **editable** en el detalle de Biblioteca (input con datalist) vía `setCategoria` (que además
  reacomoda las publicaciones `en_cola` de esa nota). Se usa en el kanban Y en WordPress: el conector
  resuelve el NOMBRE de categoría → categoría WP (buscar/crear, `resolverCategoriaWp`). Se quitó el
  selector de categoría WP del `PublishDialog` y `Asignacion.categoriaId`. `publicarEnWordpress` ahora
  toma `categoriaNombre`. (Causa del "lo puse en Nacionales y salió política": la categoría salía del
  tag de la IA y tu selección WP se descartaba.)
- Limpieza (2026-06): 5 notas "perdidas" (todas las versiones rechazadas + 0 publicaciones, víctimas
  del bug viejo del modal) movidas a la papelera por decisión del usuario.
### Bandeja v2: drag&drop + columnas desde WP — 2026-06 — HECHO
- **Columnas desde las categorías reales del WP**: el board trae en vivo las categorías del destino
  activo (`categoriasDeDestino`, ya existía) y arma las columnas con ESAS. Botón **"↻ refrescar
  categorías"** para re-traerlas; si creás una en WP aparece al reabrir el destino o refrescar.
  Sitios propios: columnas derivadas de las categorías de las notas. Notas cuya categoría no matchea
  ninguna columna WP → columna **"Sin asignar"**.
- **Drag & drop** (`@dnd-kit/core`): arrastrar card a una columna = asignar esa categoría a ESA
  publicación (`setCategoriaPublicacion`, per-publication/per-destino). Franja **"Prioritarias"**
  arriba (droppable): arrastrar ahí = `prioridad=true` (sale primero). La ⭐ sigue como atajo.
  Optimista local + server; re-siembra items por `idsKey` tras refresh.
- Matiz: la categoría pasa a ser por-publicación/per-destino (la de la nota es el default con el que llega).
- Rediseño UI (2026-06, skill ui-ux-pro-max): **sidebar colapsable** a riel de íconos (shell:
  `app-shell`+`sidebar`, estado en localStorage `sidebar-collapsed`, toggle PanelLeftClose/Open) →
  gana ancho. Bandeja **full-width** (`w-full`). Kanban **sin scroll horizontal**: grid que envuelve
  `repeat(auto-fill,minmax(240px,1fr))`, columnas `w-full`. **Toggle de vista "En cola / Actividad"**
  (la actividad dejó de estar al pie; es su propia vista). Config de ritmo solo en vista "cola".
- **Reloj "próxima tanda"** (2026-06): tile con cuenta regresiva en vivo por destino (calc server en
  `app/bandeja/page.tsx` `proximaTanda`: ventana `cadaMinutos` + cupo + franja). Estados: "en mm:ss",
  "Lista para salir", "Manual", "Cola vacía".
- **Despacho automático — DOS modos** (2026-06):
  - **A (hecho)**: auto-despacho *mientras la bandeja está abierta*. `bandeja-board` tiene un efecto
    que, si algún destino con Auto ON está "listo" (proxima<=now, hay cola), llama `despacharAhora`
    (cooldown 30s, guard firingRef). Solo corre con la pestaña abierta.
  - **B (para producción / set-and-forget)**: levantar el **Inngest Dev Server** para que corran los
    cron (ingesta `*/15`, despachador `*/10`, retención `0 4 * * *`) sin pestaña abierta. Comando (otra
    terminal, con `next dev` en :5555 corriendo):
    `npx inngest-cli@latest dev -u http://localhost:5555/api/inngest`  → dashboard en http://localhost:8288.
    En producción = Inngest Cloud (configurar `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`).
### Fase 2: AUTO-ROUTING — 2026-06 — HECHO
- `curaduria.ts` `procesar(articleId, escenarioId, forzar)`: genera y, si el escenario tiene
  `moderación=off` (o `forzar`), **auto-encola** en la bandeja de los destinos del escenario
  (`escenario_destinos`) vía `enviarACola` en vez de mandar a Moderación. En auto **fuerza 1 versión**.
  Si no hay destinos conectados → queda en Moderación (fallback). Corre en segundo plano (concurrencia 1).
- `aprobarIngesta`/`aprobarVarias` respetan el flag `moderación`. Nuevas: `aprobarYEnviar` /
  `aprobarVariasYEnviar` (forzar bandeja aunque el escenario pida moderación).
- Curaduría UI: botón **"A bandeja"** (per-fila + masivo) además de Aprobar/Descartar.
- Recorrido cerrado: ingesta → Curaduría (humano) → IA (1 v.) → [moderación=off] Bandeja → despachador → WP.
  Dos controles humanos siempre: Curaduría (entrada) + Bandeja (salida). El canvas de Escenarios YA ejecuta.
- Nota: franja del despachador asume inicio<fin (no cruza medianoche). Falta UI del switch `moderación`
  en el panel del escenario si no estuviera (verificar config-panel).

### Ajustes (config global) — 2026-06 — HECHO
- Tabla `ajustes` (1 fila id 'global', jsonb `config`, migración 0014). Tipo `AjustesConfig`
  (similitudObjetivo, maxPorFuente, retencionDias, papeleraDias).
- `server/ajustes.ts`: `getAjustes` (con defaults 0.4/10/60/14), `guardarAjustes` (clamp),
  `estadoProveedores` (lee si están las keys en .env). **Wireado de verdad**: `generar.ts` usa
  similitudObjetivo, `ingesta.ts` usa maxPorFuente, `retencion.ts` usa retencionDias/papeleraDias
  (se sacaron las constantes hardcodeadas).
- Página **/ajustes** (antes stub "próximamente") + `components/ajustes/ajustes-form.tsx`: secciones
  Generación (slider similitud), Ingesta (máx por fuente), Retención (días), Proveedores (estado
  read-only de las claves, que siguen en .env por seguridad).

## DECISIONES del usuario (2026-06)
- **Versiones↔Destinos = MIXTO/configurable**: por defecto se aprueba UNA versión y va a todos
  los destinos del escenario; pero se puede asignar versiones distintas por destino cuando haga
  falta. (La tabla `publications` (versionId, destinationId) ya soporta esto.)
- **Flujo = LOS DOS EN SERIO**: automático (por escenarios) Y manual (pegar URL), ambos
  compartiendo la **misma config y el mismo motor de generación**.

## Pipeline unificado objetivo
```
[Manual] Pegar URL ─┐
                    ├─► crear article ─► [motor compartido] generar N versiones ─► versions(en_revision)
[Auto] cron RSS/API ─► dedup ─► crear article ─► matchear escenario ─┘
   ─► moderación ─► aprobar + elegir destinos/versiones ─► [job] publicar ─► WordPress / feed propio
```

## Plan para cerrar el círculo (orden sugerido)
- ~~**A. Unificar motor**~~ → HECHO (2026-06): `src/server/generar.ts` `generarVersionesCore(articleId, params)`
  + `clasificarTags`. Lo usan el flujo manual (`notas.ts` `generarVersiones`, síncrono) y el job
  Inngest (`rewriteArticle`, ahora con el MISMO prompt anti-plagio + similitud + tags). `GenerarParams`
  lleva `escenarioId?` para sellar el job (cupo/monitoreo). Migración 0007: `rewrite_jobs.escenario_id`.
- ~~**C. Ingesta automática**~~ → HECHO (2026-06): `src/server/ingesta.ts` `ingestarFuentes()`:
  lee fuentes RSS activas → parsea (fast-xml-parser, RSS+Atom) → dedup por URL y por hash
  (`onConflictDoNothing`) → matchea escenarios activos conectados a la fuente por keywords de la
  conexión (sobre título+resumen) → extrae cuerpo (`extraerNota`, keyless; Firecrawl = plan B) →
  `generarVersionesCore` con `escenarioId`. **Cupo diario** real: cuenta `rewrite_jobs` del escenario
  desde medianoche; tope `MAX_POR_FUENTE=10` por corrida. Disparo: cron Inngest `*/15` + evento
  `sources/ingest.requested` + **botón "Ingestar ahora"** en Fuentes (acción `ingestarAhora()`, síncrona,
  no necesita el Inngest Dev Server). Ítems sin escenario que matchee NO se ingieren (evita basura).
- **B. Publicación** (cierra la salida):
  - Paso de moderación "elegir destinos / versión por destino" (mixto) → crea `publications`.
  - Conector **feed/Content API para sitios propios** (no necesita credenciales externas → primero).
  - Conector **WordPress REST API** (credenciales cifradas por destino) cuando haya un WP de prueba.
- **C. Ingesta automática** (cierra la entrada): cron Inngest que lee fuentes activas, dedup por
  URL/hash, crea artículos, matchea escenarios (por tema/keywords) y dispara el motor con cupo.
- **D. Monitoreo en vivo**: PARCIAL (2026-06). Tabla `ingest_runs` (migración 0008) + panel
  `components/fuentes/ingest-panel.tsx`: la ingesta corre en **segundo plano** (acción
  `iniciarIngesta()` crea la corrida y dispara `ingestarFuentes({runId})` fire-and-forget; el server
  Node sigue ejecutando tras responder), y el panel hace **polling** (`estadoIngesta(runId)` cada 1.5s)
  mostrando contadores animados (nuevas/generadas/salteadas/errores), progreso por fuente con pulso, y
  reloj en vivo. Al terminar hace `router.refresh()`. `iniciarIngesta` no duplica si ya hay una corriendo.
  Falta: contadores en el canvas de Escenarios por ruta (lo de verdad de Paso D).

Transversal: Firecrawl (extracción robusta), cifrado de credenciales, tope de costos.
