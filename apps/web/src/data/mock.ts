// Datos de prueba para la interfaz. Se reemplazan por queries reales más adelante.

export const kpis = {
  ingestadasHoy: 87,
  enRevision: 23,
  publicadasHoy: 41,
  costoHoy: 2.74,
  similitudMedia: 0.19,
} as const;

// Notas por día (últimas 14 jornadas): ingestadas vs publicadas.
export const trend: { dia: string; ingestadas: number; publicadas: number }[] = [
  { dia: "08/06", ingestadas: 62, publicadas: 28 },
  { dia: "09/06", ingestadas: 71, publicadas: 33 },
  { dia: "10/06", ingestadas: 58, publicadas: 30 },
  { dia: "11/06", ingestadas: 80, publicadas: 38 },
  { dia: "12/06", ingestadas: 94, publicadas: 45 },
  { dia: "13/06", ingestadas: 76, publicadas: 41 },
  { dia: "14/06", ingestadas: 69, publicadas: 36 },
  { dia: "15/06", ingestadas: 88, publicadas: 47 },
  { dia: "16/06", ingestadas: 102, publicadas: 52 },
  { dia: "17/06", ingestadas: 91, publicadas: 44 },
  { dia: "18/06", ingestadas: 84, publicadas: 39 },
  { dia: "19/06", ingestadas: 97, publicadas: 49 },
  { dia: "20/06", ingestadas: 110, publicadas: 55 },
  { dia: "21/06", ingestadas: 87, publicadas: 41 },
];

// Distribución de versiones por estado.
export const estados: { label: string; value: number; color: string }[] = [
  { label: "En revisión", value: 23, color: "var(--color-viz-2)" },
  { label: "Aprobadas", value: 41, color: "var(--color-viz-3)" },
  { label: "Publicadas", value: 128, color: "var(--color-viz-1)" },
  { label: "Rechazadas", value: 14, color: "var(--color-viz-4)" },
];

// Costo de IA por proveedor (últimos 7 días, USD).
export const costoProveedor: { proveedor: string; costo: number; color: string }[] = [
  { proveedor: "DeepSeek", costo: 11.42, color: "var(--color-viz-1)" },
  { proveedor: "Claude", costo: 6.83, color: "var(--color-viz-2)" },
];

export type SourceHealth = {
  id: string;
  nombre: string;
  tipo: "RSS" | "API" | "URL";
  estado: "activa" | "lenta" | "error";
  ultimaLectura: string;
};

export const fuentes: SourceHealth[] = [
  { id: "1", nombre: "La Nación", tipo: "RSS", estado: "activa", ultimaLectura: "hace 2 min" },
  { id: "2", nombre: "Infobae", tipo: "RSS", estado: "activa", ultimaLectura: "hace 4 min" },
  { id: "3", nombre: "Clarín", tipo: "RSS", estado: "lenta", ultimaLectura: "hace 38 min" },
  { id: "4", nombre: "Reuters API", tipo: "API", estado: "activa", ultimaLectura: "hace 1 min" },
  { id: "5", nombre: "Página/12", tipo: "RSS", estado: "error", ultimaLectura: "hace 3 h" },
  { id: "6", nombre: "Ámbito", tipo: "RSS", estado: "activa", ultimaLectura: "hace 6 min" },
];

export type Activity = {
  id: string;
  usuario: string;
  iniciales: string;
  accion: "aprobó" | "rechazó" | "editó" | "publicó";
  nota: string;
  cuando: string;
};

export const actividad: Activity[] = [
  { id: "1", usuario: "Lucía Romero", iniciales: "LR", accion: "aprobó", nota: "El banco central recorta la tasa de referencia", cuando: "hace 3 min" },
  { id: "2", usuario: "Diego Sosa", iniciales: "DS", accion: "publicó", nota: "Nuevo récord de exportaciones en mayo", cuando: "hace 12 min" },
  { id: "3", usuario: "Lucía Romero", iniciales: "LR", accion: "editó", nota: "Acuerdo paritario en el sector docente", cuando: "hace 20 min" },
  { id: "4", usuario: "María Paz", iniciales: "MP", accion: "rechazó", nota: "Rumores sobre el mercado de pases", cuando: "hace 41 min" },
  { id: "5", usuario: "Diego Sosa", iniciales: "DS", accion: "aprobó", nota: "Avanza la obra del nuevo hospital regional", cuando: "hace 1 h" },
];
