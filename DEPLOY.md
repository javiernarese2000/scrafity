# Deploy — panel de Redes (Zoocial) + worker

Monorepo `scrafity`. Para la **prueba en la nube** subimos 2 servicios nuevos a
Railway desde **este mismo repo**, rama **`redes`**. Producción de Noticias
(`main`) **no se toca**.

> Los **valores** de las variables están en tu `.env` local (DEV) — copialos de
> ahí. Nunca se commitean.

## Supabase (para el test): reusar el proyecto DEV (free)
Ya tiene el esquema (migraciones 0001→0024), el bucket `videos` y la cuenta de
Zoocial conectada. Cero pasos extra. Se pasa a **Pro** recién para producción
real (storage/egress/no-pausa).

## Servicio 1 — Worker de render (`apps/worker`)
- **Root Directory:** `apps/worker` (Railway detecta el `Dockerfile`).
- **Variables:**
  - `DATABASE_URL` → el **pooler** (mismo de `apps/worker/sample/worker.env`).
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DISPATCH_URL` → `https://<URL-DEL-PANEL>/api/cron/despachar?key=<CRON_SECRET>`
    (se completa cuando el panel ya tenga dominio).
- No necesita dominio público (es background); Railway igual le asigna `PORT`
  para el `/health`.

## Servicio 2 — Panel de Redes (`apps/social`, Next.js)
- **Root Directory:** la **raíz del repo** (es un workspace pnpm; necesita los
  `packages/`).
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @scrapify/social build`
- **Start Command:** `pnpm --filter @scrapify/social start`
- **Variables:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL` (pooler)
  - `ENCRYPTION_KEY` (el mismo del `.env`; si cambia, no se pueden descifrar los
    tokens de Meta ya guardados)
  - `META_APP_ID`
  - `META_APP_SECRET` (usar el **nuevo**, después de resetearlo en Meta)
  - `META_REDIRECT_URI` → `https://<URL-DEL-PANEL>/api/meta/callback`
  - `CRON_SECRET` → un string random largo (inventalo; va igual en `DISPATCH_URL`)

## Post-deploy (cuando el panel ya tiene URL)
1. En **Meta → Facebook Login → Configuración**, agregar a "URIs de
   redireccionamiento válidos": `https://<URL-DEL-PANEL>/api/meta/callback`.
2. Completar `META_REDIRECT_URI` (panel) y `DISPATCH_URL` (worker) con esa URL.
3. Entrar al panel desplegado → **Cuentas → Conectar con Meta** (reconectar, los
   tokens son por dominio/uso).
4. Probar: Estudio → render → Componer → programar → el worker despacha solo.

## Producción real (más adelante)
- Supabase **Pro** (storage/egress/no-pausa).
- **App Review + verificación de negocio** de Meta (para publicar en cuentas de
  clientes, no solo las propias).
- Mergear `redes` → `main` cuando esté probado.
