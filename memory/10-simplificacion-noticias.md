# 10 · Simplificación de Noticias (apps/web) — "volver a la esencia"

Contexto: tras desarrollar mucho Redes (apps/social), el usuario vuelve a Scrafity/Noticias
(apps/web) con el objetivo de **simplificar el flujo**. Decisión de estrategia tomada:
**Opción 1 bien entendida** — construir un flujo simple NUEVO que **reusa todo el backend**
(motor IA, WordPress, ingesta, DB), sin app aparte: pantallas nuevas dentro de `apps/web`.
Lo viejo queda intacto hasta que lo nuevo lo reemplace.

## Principio de diseño
El editor no piensa "aprobar noticias"; piensa: ¿qué publico hoy? ¿a qué sitio va cada una?
¿está balanceado (no todo deportes)? ¿tengo material para todos mis medios? → Dos vistas:
- **Noticias** (entrada): feed único que funde Bandeja de entrada + Moderación.
- **Calendario** (salida): planificación, funde Bandeja de salida + Biblioteca (pasado).

Menú objetivo (10, baja de 14): Dashboard · Noticias · Calendario · Pegar URL · Fuentes ·
Destinos · Multimedia · Papelera · Usuarios · Ajustes. (Desaparecen como pantalla: Bandeja
entrada, Moderación, Bandeja salida, Biblioteca, Escenarios, Ayuda.)

## Decisiones del usuario (AskUserQuestion)
1. **Escenarios**: dejarlo como está por ahora (se esconderá del menú luego; sigue por detrás).
2. **Moderación**: editor OPCIONAL al "Preparar" (genera IA + abre editor lateral; podés
   programar/publicar sin leer, o editar). No es bandeja aparte ni obligatorio.
3. **Arranque**: **Calendario primero**.

## Módulo Usuarios (apps/web) — HECHO
Roles **admin | editor** (sin "area", a diferencia de social). Usa Supabase Auth
`user_metadata.rol` (regla anti-bloqueo: admin salvo editor explícito). Archivos:
- `src/lib/roles.ts` (rolDeUsuario/esAdmin), `src/server/usuarios.ts` (CRUD admin API),
  `app/usuarios/page.tsx` (gate esAdmin→redirect), `src/components/usuarios/usuarios-board.tsx`.
- Nav: `nav.ts` NavItem tiene `adminOnly?`; item Usuarios adminOnly. `sidebar.tsx` filtra
  `navItems.filter(i=>!i.adminOnly||isAdmin)`. `app-shell.tsx` recibe `isAdmin`. `layout.tsx`
  ahora es **async**: fetch user + `esAdmin` → `<AppShell isAdmin>`.
- Password DEV de narese@gmail.com reseteada a `Scrapify2026!` (proyecto DEV dnptcdzimdyeoqykywul).

## Calendario (Incremento 1) — HECHO, compila
Backend reusado + 1 agregado real:
- **Migración 0027** (`0027_powerful_alice.sql`): `publications.programada_en timestamptz null`.
  null = despacho por cadencia (previo); con fecha futura, el despachador espera.
- **despachador.ts** (`despachar()`): (1) primer pase suelta las `en_cola` con
  `programadaEn <= now` SIN importar cadencia (promesa del calendario); (2) el loop de cadencia
  ahora filtra `isNull(programadaEn)`. Backward-compatible.
- **src/server/calendario.ts** (nuevo, "use server"): `listarCalendario(desde,hasta)` (join
  publications+versions+destinations; en_cola/error por programadaEn, publicadas por updatedAt),
  `listarSinProgramar()` (en_cola sin fecha = backlog), `reprogramar(id,iso)`, `desprogramar(id)`,
  `publicarAhora(id)` (reusa publicarItem), `quitarDelCalendario(id)`. Exporta tipos
  CalendarioEvento / SinProgramarRow (los tipos SÍ se pueden exportar de "use server").
- **app/calendario/page.tsx**: carga destinos (id,nombre) y renderiza el board.
- **src/components/calendario/calendario-board.tsx**: grilla MENSUAL (no timeline horario como
  Zoocial — decisión: mensual encaja mejor para "qué publico esta semana / balance por sitio").
  Color por destino (PALETA). Panel lateral derecho (framer-motion): PanelDia (lista del día +
  backlog "sin programar" con time-picker → Programar) y PanelEvento (reprogramar fecha/hora,
  publicar ahora, sin fecha, quitar; si publicada muestra link). Leyenda de destinos abajo.
- Nav: item "Calendario" (CalendarDays) tras Dashboard.

Para que el calendario tenga eventos hace falta que existan `publications` (flujo actual de
Bandeja de salida crea `en_cola`). Esas sin fecha aparecen en "Sin programar"; al asignarles día
se setea programadaEn y el despachador las suelta a esa hora.

## Hub Noticias (feed que carga el calendario) — HECHO, compila
El editor no "carga el calendario": trabaja en el feed y desde cada noticia hace "Programar".
- **src/server/noticias.ts** (nuevo, "use server"):
  - `prepararNota(articleId)`: si no hay versión usable (en_revision/aprobada/borrador), corre
    `generarVersionesCore` (1 versión, tono Neutro, await → la IA queda lista). NO cambia curación
    (si cancelás, la nota sigue en el feed). Devuelve versionId/titulo/contenido/similarity +
    destinosSugeridos (de escenarioDestinos por el escenarioId de la nota).
  - `programarNota({articleId,versionId,titulo,contenido,destinos[],fechaISO})`: guarda el texto
    editado (versión→aprobada), crea `publications` en_cola con `programadaEn` por cada sitio,
    rechaza hermanas en_revision, marca artículo curación=aprobada (sale del feed). revalida
    /noticias /calendario /bandeja.
  - `descartarNota(articleId)`: curación=descartada.
- **app/noticias/page.tsx**: lista articles curación=pendiente (mismo query que curaduría) +
  destinos. Helpers relativo()/resumen().
- **src/components/noticias/noticias-board.tsx**: feed de tarjetas (imagen, fuente, fecha,
  categoría, título, resumen) con "Programar" / "Descartar" / "Original". "Programar" abre panel
  lateral derecho: llama prepararNota (spinner "Reescribiendo con IA…"), muestra título+texto
  editables + similarity, checkboxes de sitios (pre-marca sugeridos), día+hora (default próxima
  hora redonda) → programarNota → la nota va al calendario y desaparece del feed.
- Nav: item "Noticias" (icono Rss) tras Calendario.
- Flujo nuevo completo: Fuentes ingesta → **Noticias** (Programar: IA + sitio + hora) →
  **Calendario** (sale a su hora). Colapsa Entrada+Moderación+Salida en 1 feed + 1 acción.

## Limpieza para editores — HECHO (roles en el menú + guardas)
- **src/lib/auth-guard.ts** nuevo: `requireAdmin()` (redirect "/" si no es admin). Aplicado como
  primera línea en las páginas admin: destinos, fuentes, ajustes, escenarios, moderacion,
  curaduria. (usuarios ya tenía guarda inline.) Esconder del menú NO alcanzaba: sin guarda un
  editor entraba por URL.
- **nav.ts**: `adminOnly:true` en Bandeja de entrada, Moderación, Escenarios, Fuentes, Destinos,
  Usuarios, Ajustes.
- **Editor ve**: Dashboard · Calendario · Noticias · Bandeja de salida · Pegar URL · Biblioteca ·
  Multimedia · Papelera · Ayuda. **Admin ve** todo.
- Decisiones: Entrada+Moderación se esconden solo a editores (admin las conserva de respaldo);
  Fuentes pasa a admin-only (coherente con Destinos).

## Despachador en el calendario — HECHO
- Botón "Despachar ahora" en /calendario (server action `despacharProgramadas` → `despachar()`),
  para soltar las vencidas sin depender del cron (útil en local sin Inngest).
- Cron `despacharCola` bajado de */10 a */2 min (precisión del calendario). El despachador ya
  suelta las programadas vencidas (primer pase, sin cadencia) — ver bloque Calendario.
- OJO local: el cron de Inngest NO corre con solo `next dev`; usar el botón o levantar Inngest.

## Ingesta en Noticias (Tramo 2) — HECHO, compila
- **Migración 0028**: `sources.categoria` (text nullable).
- **ingesta.ts DESACOPLADO**: `ingestarFuentes` ya NO descarta las notas sin escenario — las
  crea igual (`escenarioId: esc?.id ?? null`). Escenario ahora es best-effort (params/ruteo).
  Nuevos opts: `sourceIds[]`, `categoria`, `maxPorFuente` (override), `palabra` (filtro ad-hoc
  sobre título+resumen). El cron `ingestSources` (sin opts) ahora trae TODO de las activas.
- **fuentes.ts**: `createFuente` acepta categoria; `setFuenteCategoria(id,cat)`; `iniciarIngesta`
  acepta opts (sourceIds/categoria/maxPorFuente/palabra) y los pasa a ingestarFuentes.
- **Fuentes UI** (admin): categoría en el alta + `<select>` inline por fila (CATEGORIAS de
  @/lib/categorias). FuenteRow.categoria + query.
- **Noticias**: botón "Traer noticias" → `TraerDialog` (categoría filtra fuentes, checkboxes de
  fuentes, cuántas por fuente, palabra) → `iniciarIngesta` background + polling `estadoIngesta`
  (progreso en vivo por fuente) → al terminar router.refresh (aparecen en el feed). El fondo
  fire-and-forget SÍ corre en local (a diferencia del cron de despacho).
- Página Noticias pasa `fuentes` (id,nombre,categoria) al board.
- Círculo del editor cerrado: Traer → Programar → Calendario, todo en Noticias.

## (histórico) Ingesta en Noticias (decisiones tomadas)
El nudo: hoy `ingestarFuentes()` SOLO crea nota si matchea un Escenario por keywords con cupo;
sin escenario → 0 notas (por eso Escenarios se volvió obligatorio y confuso).
Decidido:
- **Desacoplar**: las fuentes crean notas directo (pendiente), sin escenario obligatorio
  (escenarioId ya es nullable; params default neutro/1versión = lo que ya hace prepararNota).
- **Escenarios** → automatización OPCIONAL admin-only (no se borra).
- **Botón "Traer noticias"** en Noticias con setear: **por categorías** (Política/Economía…),
  **elegir fuentes**, **cuántas por fuente**, **filtro por palabra** (ad-hoc). Progreso en vivo
  (infra `ingest_runs` ya existe).
- "Traer por categoría" necesita una **categoría en `sources`** (migración + UI en Fuentes admin),
  porque la categoría real se sabe recién tras clasificar; lo más barato/preciso es taggear la
  fuente. (A decidir al construir: general vs por-sección.)

## Categorías por Destino + Ingesta dirigida — HECHO (Fases 1-3), typecheck OK
Decisiones: categorías POR DESTINO; ingesta dirigible por Destino/Categoría/Fuente; SIEMPRE
clasifica con IA (sin atajo por fuente).
- **Migración 0029**: `destinations.categorias text[]` default '{}'.
- **destinos.ts**: `createDestino` acepta categorias; `setDestinoCategorias(id, cats)`.
- **Destinos UI**: `CategoriasInput` (chips add/quitar) en el alta + botón Tags por fila que abre
  modal "Categorías · <destino>". Badges de categorías en la fila. DestinoRow.categorias.
- **generar.ts**: `clasificarTags(titulo, contenido, proveedor, categorias=CATEGORIAS)` — apunta a
  la lista dada.
- **ingesta.ts**: clasifica ANTES de insertar (para poder filtrar). `categoriasObjetivo` = unión de
  `destinations.categorias` (o CATEGORIAS si vacío) → se pasa a clasificarTags. Guarda
  categoria+tags en el insert. Nuevo opt `categorias?: string[]` (filtro de NOTA): si se pide y la
  nota no cae, se descarta. Se sacó el filtro viejo por `sources.categoria`. Helper
  `emparejarCategoria(raw, lista)`.
- **fuentes.ts**: `iniciarIngesta` opt `categorias?: string[]` (reemplaza `categoria` singular).
- **TraerDialog**: ejes Destino (select → setea sus categorías) / Categoría (chips toggle de la
  unión) / Fuente (checkboxes). Pasa sourceIds + categorias + maxPorFuente + palabra. Ya tiene la
  animación IngestAnimation.
- **Noticias page/board**: pasa destinos (con categorias) + unión de categorías al board→diálogo.
- Nota: `sources.categoria` (migración 0028) quedó sin usar en el filtrado (la clasificación es por
  nota). Sigue el select en Fuentes; se puede quitar o repurposar luego.

## Pendiente inmediato
- Que el usuario pruebe el Calendario en local (`pnpm --filter @scrapify/web dev`).
- Posible extra: vista timeline día/semana estilo Zoocial (precisión de minutos) si la pide.
- Siguiente hub: **Noticias** (feed de entrada unificado + editor lateral "Preparar").
- Luego: reestructurar nav (esconder Bandeja x2/Moderación/Biblioteca/Escenarios/Ayuda) cuando
  ambos hubs estén validados. Rama actual: `redes` (Noticias prod sigue en `main`).
