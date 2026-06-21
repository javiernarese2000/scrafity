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
- Neon vs Supabase para Postgres.
- Better-Auth vs Clerk para auth.

## Próximo paso sugerido
Armar el scaffold del monorepo + esquema Drizzle de la Fase 1.
