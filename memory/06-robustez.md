# Robustez — Scrafity

Ideas para hacer la plataforma sólida. Priorizadas por fase en `07-fases-y-pendientes.md`.

## Contenido / legal (crítico en este rubro)
- **Detección de duplicados**: fingerprint (`hash_contenido` + similitud) para no ingerir
  la misma nota dos veces desde distintas fuentes.
- **Score de similitud vs original**: medir cuánto se parece la versión reescrita a la
  fuente. Si supera umbral, marcar en rojo en moderación (anti-plagio/copyright).
- **Atribución y trazabilidad**: guardar siempre URL fuente, autor, fecha y snapshot del
  original por nota.
- **Notas con muro de pago / login** (consulta del usuario, 2026): NO construir sobre
  técnicas de bypass (UA Googlebot, deshabilitar JS, sitios de archivo) → riesgo legal
  (copyright: DMCA §1201 / ley 11.723 AR; ToS) y frágil. Caminos legítimos: (1) licenciamiento/
  sindicación, (2) APIs de agencias (Reuters/AP/AFP/Télam), (3) RSS full-text, (4) acceso
  autenticado con suscripción propia válida (revisar ToS, suele prohibir automatización),
  (5) agregadores con licencia. Soporte técnico: credenciales/cookies por fuente **cifradas**
  + fetch autenticado (Firecrawl permite pasar headers/cookies de sesión). **Pendiente:
  consulta legal antes de producción** por el modelo de reescribir+republicar.

## Operación
- **Monitor de salud de fuentes**: si un RSS deja de responder o un scraping falla, alertar
  en el panel (las fuentes se rompen seguido). Job cron `health.check-sources`.
- **Idempotencia en publicación**: `idempotency_key` para no publicar dos veces si un job
  se reintenta.
- **Reintentos con backoff**: Inngest lo da; definir política por tipo de error
  (rate limit de IA vs sitio caído vs error de parseo).
- **Control de costos de IA**: registrar tokens/costo por nota y proveedor; dashboard de gasto.
- **Audit log**: quién aprobó/editó/publicó qué y cuándo.
- **Cifrado de credenciales**: tokens de WordPress/CMS nunca en texto plano.

## Producto (a futuro, no MVP)
- Programación de publicación (publicar a las X hs).
- Plantillas de prompt por tipo de nota o por destino.
- Categorización/tagging automático con IA para enrutar a la sección correcta del WordPress.
- Versionado/historial de ediciones del moderador.
