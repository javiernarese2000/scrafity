# Worker de render — servicio AISLADO (no comparte contenedor con la web).
FROM node:22-slim

# FFmpeg (escala/cover + overlay + audio) + certificados.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Deps (incluye Playwright). Standalone: sin deps del workspace.
COPY package.json tsconfig.json ./
RUN npm install

# Chromium para renderizar el overlay (zócalo/logo/marca) con el mismo HTML/CSS
# y fuentes que el preview → fidelidad pixel-perfect.
RUN npx playwright install --with-deps chromium

COPY src ./src
RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
