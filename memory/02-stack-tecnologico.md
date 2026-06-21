# Stack tecnológico — Scrapify

Decisión: **TypeScript full-stack**, monorepo, empezar barato y escalar por volumen.

| Capa | Elección | Por qué |
|------|----------|---------|
| Monorepo | pnpm + Turborepo | Front, API y workers en un repo, un solo lenguaje |
| Front + Admin | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui | Panel de gestión y moderación |
| API | Route Handlers de Next + tRPC | Type-safe de punta a punta |
| DB | PostgreSQL (Neon o Supabase) + Drizzle ORM | De MVP a escala; serverless al inicio |
| Jobs/colas | **Inngest** | Background jobs con reintentos/backoff, sin montar Redis |
| Ingesta URLs | **Firecrawl** (extracción limpia de contenido) + `rss-parser` para feeds | Evita mantener Playwright propio al inicio; self-host después |
| IA | **Multi-proveedor**: DeepSeek (volumen/barato) + Claude `@anthropic-ai/sdk` (calidad) | Routing configurable + fallback automático |
| Publicación | Conector WordPress REST API (sitios cliente) + Content API/feed headless (sitios propios) | Cubre ambos destinos |
| Auth | Better-Auth o Clerk | Login del panel **solo interno** (equipo); roles admin/moderador. Sin login de clientes |
| Hosting | Vercel (front+API) + Inngest gestionado → Railway/Fly al escalar | Cero infra al inicio |

## Capa de IA (detalle)
- Abstracción con interfaz común (`generate(prompt, opts)`), implementaciones para DeepSeek
  y Claude. Selección por config de usuario/fuente.
- **Estrategia de costo**: DeepSeek genera los borradores en volumen; Claude (Sonnet 4.6)
  para pulido/calidad cuando se requiera. Opus 4.8 reservado para casos de alta exigencia.
- **Fallback**: si un proveedor falla o da rate limit, reintenta con el otro.
- Registrar tokens y costo por generación y proveedor (ver `06-robustez.md`).

## Cuentas/credenciales del usuario
- Tiene cuenta en **Claude (Anthropic)** y en **DeepSeek**.

## Decisiones abiertas
- Inngest vs Trigger.dev vs BullMQ+Redis → elegido **Inngest** (revisable al escalar).
- Firecrawl (pago, simple) vs Playwright propio (gratis, más trabajo) → **Firecrawl** al inicio.
- ~~Multi-tenant~~ → **RESUELTO**: plataforma solo interna, sin login de clientes. Destinos =
  sitios propios (headless/API) + WordPress de clientes (API con credenciales por sitio).
- Neon vs Supabase para Postgres → decidir al scaffoldear (Supabase suma auth/storage).
