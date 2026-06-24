FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* se inlinean en build-time: deben estar presentes al compilar.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
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
