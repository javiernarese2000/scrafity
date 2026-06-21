// Datos de prueba para la pantalla "Pegar URL".

export const sampleExtract = {
  fuente: "La Nación",
  titulo: "El sector tecnológico lidera la recuperación del empleo en el último trimestre",
  autor: "R. Méndez",
  fecha: "20/06/2026",
  contenido:
    "El empleo en el sector tecnológico creció un ocho por ciento durante el último trimestre, según un informe difundido esta semana por la cámara del sector. La demanda de perfiles vinculados a inteligencia artificial y análisis de datos explica buena parte de la suba. Las empresas señalaron dificultades para cubrir las vacantes y advirtieron que la brecha de talento podría profundizarse durante el próximo año. Desde el organismo destacaron que los programas de formación acelerada comienzan a mostrar resultados, aunque insuficientes frente al ritmo de la demanda.",
};

export type DestinoDisponible = {
  id: string;
  nombre: string;
  tipo: "wordpress_cliente" | "sitio_propio";
};

export const destinosDisponibles: DestinoDisponible[] = [
  { id: "d1", nombre: "Diario Cliente A", tipo: "wordpress_cliente" },
  { id: "d2", nombre: "Portal Cliente B", tipo: "wordpress_cliente" },
  { id: "d3", nombre: "Nuestro Sitio · Economía", tipo: "sitio_propio" },
  { id: "d4", nombre: "Nuestro Sitio · Tecnología", tipo: "sitio_propio" },
];

export const tonos = ["Neutro", "Formal", "Informal", "SEO", "Breve"] as const;
export const proveedores = ["Auto", "DeepSeek", "Claude"] as const;
