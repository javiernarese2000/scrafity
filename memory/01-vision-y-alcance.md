# Visión y alcance — Scrapify

## Qué es
Plataforma para medios/redacciones que combina dos productos sobre una misma base:

1. **Agregador de noticias** — conecta fuentes (RSS, APIs de noticias, URLs) e ingiere
   "notas" automáticamente.
2. **Generador/Reescritor con IA** — se pega la URL de una nota fuente, la IA genera N
   versiones reescritas, un moderador humano las revisa/edita, y se publican en distintos
   sitios destino.

## Decisiones de producto confirmadas con el usuario
- **Moderación humana obligatoria**: ninguna versión se publica sin que un moderador la
  revise (y posiblemente reescriba) y la apruebe.
- **Versiones configurables**: al pegar la URL, el usuario elige cuántas versiones quiere
  generar. También (propuesto): tono, proveedor de IA y destinos.
- **Tenancy**: la plataforma Scrapify es **solo interna** (la opera nuestro equipo). Los
  clientes NO se loguean en Scrapify.
- **Destinos** (dos tipos):
  - **Sitios propios**: no tienen admin propio; son *headless* y se retroalimentan de
    Scrapify, que actúa como **CMS headless** y les expone el contenido vía API/feed.
  - **Sitios de clientes**: son **WordPress**; publicamos en ellos vía REST API con
    credenciales por sitio.
- **Volumen inicial**: 50–150 notas/día. Con ~3 versiones = ~150–450 generaciones IA/día
  → escala trivial al inicio, pero la arquitectura debe escalar con el volumen.

## Riesgo a tener presente
Reescribir notas de terceros tiene **riesgo de copyright/plagio**. Mitigaciones previstas
en `06-robustez.md` (score de similitud vs original, atribución, snapshot del original).
Conviene definir política editorial con el usuario antes de producción.
