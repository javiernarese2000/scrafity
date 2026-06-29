export type Region = { id: string; label: string; flag: string };

export const REGIONES: Region[] = [
  { id: "AR", label: "Argentina", flag: "🇦🇷" },
  { id: "MX", label: "México", flag: "🇲🇽" },
  { id: "ES", label: "España", flag: "🇪🇸" },
  { id: "CL", label: "Chile", flag: "🇨🇱" },
  { id: "CO", label: "Colombia", flag: "🇨🇴" },
  { id: "US", label: "EE.UU.", flag: "🇺🇸" },
];

export type Tendencia = {
  rank: number;
  termino: string;
  traffic: string;
  trafficNum: number;
  imagen: string | null;
  noticia: { titulo: string; url: string; fuente: string | null } | null;
};
