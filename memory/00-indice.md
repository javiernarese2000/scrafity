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

## Estado actual
**Fase:** Fase 1 — UI en construcción (con datos mock; backend desconectado a propósito).
Hecho: scaffold + Supabase (8 tablas) + **app shell** (sidebar, topbar, tema claro/oscuro)
+ **Dashboard** (KPIs, gráficos SVG animados, salud de fuentes, actividad)
+ **Cola de moderación** (maestro-detalle, tabs de versiones, diff real por palabras vs
  original, indicador de similitud, acciones aprobar/editar/rechazar, toast) + stubs de rutas.
Kit propio + Framer Motion. Pasada de refinamiento aplicada (sombras suaves, más fino).
Falta: pantalla Pegar URL, conexión de IA/ingesta, auth, mover UI de mock a queries reales.
**Última actualización:** 2026-06-21.

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
