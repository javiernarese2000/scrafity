# Modelo de datos (borrador) — Scrapify

Postgres + Drizzle. Borrador inicial, a refinar en el scaffold.

```
users          (id, email, rol[admin|moderador], creado)
sources        (id, tipo[rss|api|url], url, config_json, estado, last_check, last_error)
articles       (id, source_id?, url_original, autor, titulo, contenido,
                hash_contenido, snapshot_original, fecha_original, creado)
rewrite_jobs   (id, article_id, n_versiones, tono, proveedor, estado, creado)
versions       (id, article_id, rewrite_job_id, contenido, titulo,
                similarity_score, proveedor, tokens_in, tokens_out, costo,
                estado[borrador|en_revision|aprobada|rechazada|publicada],
                editado_por?, creado)
destinations   (id, tipo[wordpress_cliente|sitio_propio], nombre, config_api_json,
                credenciales_cifradas, estado)
                -- wordpress_cliente: push vía REST API (credenciales por sitio)
                -- sitio_propio: pull vía Content API/feed (headless, sin admin)
publications   (id, version_id, destination_id, estado, url_publicada,
                external_id, idempotency_key, fecha)
audit_log      (id, user_id, accion, entidad, entidad_id, payload_json, fecha)
```

## Notas de diseño
- `hash_contenido` en `articles` → detección de duplicados en ingesta.
- `snapshot_original` → guardar el original para atribución/trazabilidad (legal).
- `similarity_score` en `versions` → medir parecido con el original (alerta de plagio).
- `tokens_in/out` + `costo` → dashboard de costos de IA por proveedor.
- `idempotency_key` + `external_id` en `publications` → evitar publicar dos veces.
- `credenciales_cifradas` → nunca guardar tokens de WordPress en texto plano.

## Tenancy (resuelto)
- Plataforma **solo interna**: `users` son del equipo (admin/moderador). No hay `tenant_id`
  por cliente. Los "clientes" existen solo como `destinations` de tipo `wordpress_cliente`.
