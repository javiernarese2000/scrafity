export type Pos = { x: number; y: number };

export type GraphFuente = {
  id: string;
  nombre: string;
  tipo: "rss" | "api" | "url";
  estado: string;
} & Pos;

export type GraphDestino = {
  id: string;
  nombre: string;
  tipo: "wordpress_cliente" | "sitio_propio";
  estado: string;
} & Pos;

export type GraphEscenario = {
  id: string;
  nombre: string;
  tema: string | null;
  keywords: string[];
  nVersiones: number;
  tono: string;
  proveedor: "deepseek" | "claude" | "auto";
  moderacion: boolean;
  cupoDiario: number | null;
  activo: boolean;
  linksFuente: { refId: string; keywords: string[] }[];
  linksDestino: { refId: string; keywords: string[] }[];
} & Pos;

export type GraphData = {
  fuentes: GraphFuente[];
  destinos: GraphDestino[];
  escenarios: GraphEscenario[];
};

export type EscenarioConfig = {
  nombre: string;
  tema: string | null;
  nVersiones: number;
  tono: string;
  proveedor: "deepseek" | "claude" | "auto";
  moderacion: boolean;
  cupoDiario: number | null;
  activo: boolean;
};
