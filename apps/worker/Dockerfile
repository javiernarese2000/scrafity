# Worker de render — servicio AISLADO con FFmpeg (no comparte contenedor con la web).
FROM node:22-slim

# FFmpeg + tipografía para el zócalo (drawtext necesita un .ttf en el sistema).
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Paquete standalone (sin deps del workspace): instala solo lo de build.
COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
