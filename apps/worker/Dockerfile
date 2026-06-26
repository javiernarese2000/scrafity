# Worker de render — servicio AISLADO con FFmpeg (no comparte contenedor con la web).
FROM node:22-slim

# FFmpeg + tipografías (drawtext necesita .ttf en el sistema). La alineación por
# línea del zócalo se hace por código (un drawtext por línea), así sirve en 5.1.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Tipografías de impacto del Estudio (Anton, Bebas Neue, Oswald) desde Google Fonts.
RUN mkdir -p /usr/share/fonts/truetype/zoocial \
  && curl -fsSL -o /usr/share/fonts/truetype/zoocial/Anton-Regular.ttf \
       https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf \
  && curl -fsSL -o /usr/share/fonts/truetype/zoocial/BebasNeue-Regular.ttf \
       https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf \
  && curl -fsSL -o /usr/share/fonts/truetype/zoocial/Oswald.ttf \
       "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf"

WORKDIR /app

# Paquete standalone (sin deps del workspace): instala solo lo de build.
COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
