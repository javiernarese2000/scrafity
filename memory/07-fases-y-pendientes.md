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
2. Inngest está "enchufado pero apagado": la generación real usa un server action SÍNCRONO,
   no el job `rewriteArticle`. Para volumen hay que mover la generación a Inngest.
3. Extracción (Readability) es el eslabón débil → producción necesita Firecrawl / fetch autenticado.
4. Falta **dedup en ingesta** (RSS repite ítems; el índice único de `hash` tiraría error sin manejar).
5. `cupoDiario` se configura pero no se aplica; no hay tope de costo real.
6. Credenciales de destino: campo existe pero **sin cifrado** implementado.

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
- **A. Unificar motor**: extraer `generarVersionesCore(articleId, params)` usado por el flujo
  manual (síncrono) y por el job Inngest (auto). Base de "los dos en serio".
- **B. Publicación** (cierra la salida):
  - Paso de moderación "elegir destinos / versión por destino" (mixto) → crea `publications`.
  - Conector **feed/Content API para sitios propios** (no necesita credenciales externas → primero).
  - Conector **WordPress REST API** (credenciales cifradas por destino) cuando haya un WP de prueba.
- **C. Ingesta automática** (cierra la entrada): cron Inngest que lee fuentes activas, dedup por
  URL/hash, crea artículos, matchea escenarios (por tema/keywords) y dispara el motor con cupo.
- **D. Monitoreo en vivo** en el canvas (contadores reales por ruta).

Transversal: Firecrawl (extracción robusta), cifrado de credenciales, tope de costos.
