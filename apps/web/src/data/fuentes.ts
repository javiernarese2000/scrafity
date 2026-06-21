// Datos de prueba para la pantalla de Fuentes.

export type FuenteEstado = "activa" | "pausada" | "error";

export type Fuente = {
  id: string;
  nombre: string;
  tipo: "RSS" | "API" | "URL";
  url: string;
  estado: FuenteEstado;
  ultimaLectura: string;
  ingestadas: number;
};

export const fuentesData: Fuente[] = [
  { id: "f1", nombre: "La Nación", tipo: "RSS", url: "lanacion.com/feed", estado: "activa", ultimaLectura: "hace 2 min", ingestadas: 1284 },
  { id: "f2", nombre: "Infobae", tipo: "RSS", url: "infobae.com/rss", estado: "activa", ultimaLectura: "hace 4 min", ingestadas: 982 },
  { id: "f3", nombre: "Clarín", tipo: "RSS", url: "clarin.com/rss/politica", estado: "pausada", ultimaLectura: "hace 38 min", ingestadas: 1456 },
  { id: "f4", nombre: "Reuters", tipo: "API", url: "api.reuters.com/v2", estado: "activa", ultimaLectura: "hace 1 min", ingestadas: 743 },
  { id: "f5", nombre: "Página/12", tipo: "RSS", url: "pagina12.com.ar/rss", estado: "error", ultimaLectura: "hace 3 h", ingestadas: 521 },
  { id: "f6", nombre: "Ámbito", tipo: "RSS", url: "ambito.com/rss/economia", estado: "activa", ultimaLectura: "hace 6 min", ingestadas: 668 },
];
