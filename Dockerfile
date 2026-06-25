FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* se inlinean en build-time. Son valores PÚBLICOS (van al navegador,
# los datos los protege RLS), por eso se dejan como default y el build siempre los
# tiene. Railway puede sobreescribirlos pasando build-args con el mismo nombre.
ARG NEXT_PUBLIC_SUPABASE_URL=https://ygmjxlhkxykmrlqclbgo.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_cokJzXO2dndKzW9xJ2nLyw_4w0sgzhV
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @scrapify/web build

FROM base AS run
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@scrapify/web", "start"]
