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

## Próximo paso sugerido
Construir la **cola de moderación** (pantalla estrella) con datos mock, al nivel de
terminación del dashboard.
