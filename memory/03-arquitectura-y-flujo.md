# Arquitectura y flujo — Scrapify

## Principio central
El núcleo técnico **no es el sitio web, son los jobs en segundo plano**: scrapear, parsear,
llamar a la IA y publicar son procesos lentos y que pueden fallar. Por eso se usa Inngest
con reintentos/backoff, y el front solo dispara y observa esos jobs.

## Flujo de datos
```
Fuentes (RSS / API / URL pegada)
        │  Inngest job: ingesta (Firecrawl / rss-parser)
        ▼
   Postgres (nota cruda + snapshot del original)
        │  Inngest job: reescritura IA (N versiones, proveedor configurable)
        ▼
   Versiones (borrador)  ──►  cola de moderación
        │
   ┌────┴───────────────┬──────────────────┐
 editar/reescribir   aprobar            rechazar
        │                │
        └────────►  programar/publicar
                         │  Inngest job: publicar (idempotente)
                         ▼
        ┌────────────────┴─────────────────┐
   WordPress REST API              Content API / feed
   (sitios de clientes)           (sitios propios headless)
```

## Dos modos de publicación
- **Push (clientes / WordPress)**: Scrapify envía la nota al WordPress del cliente vía REST
  API. Credenciales por destino.
- **Pull (sitios propios)**: los sitios propios no tienen admin; consultan una **Content API
  / feed** de Scrapify y renderizan el contenido aprobado. Scrapify = CMS headless.
  Conviene exponer endpoints públicos cacheados (por sitio/categoría) e invalidar al publicar.

## Parámetros al pegar una URL
- Cantidad de versiones (N).
- Tono (formal / informal / SEO / breve…).
- Proveedor de IA (DeepSeek / Claude / auto).
- Destinos objetivo.

## Máquina de estados de una nota
`ingestada → generando → en_revisión → aprobada → publicada`
Estados alternos: `rechazada`, `error`.

## Jobs Inngest principales
1. `ingest.source` — leer RSS/API o extraer URL → crea `article`.
2. `rewrite.article` — genera N `versions` con IA.
3. `publish.version` — publica en destino (idempotente, ver `06-robustez.md`).
4. `health.check-sources` (cron) — monitorea salud de fuentes.

## Hosting
Vercel para Next (front+API). Inngest gestionado al inicio. Al escalar, mover workers
pesados (ej. scraping propio con Playwright) a Railway/Fly.
