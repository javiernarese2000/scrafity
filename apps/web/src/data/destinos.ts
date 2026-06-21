// Datos de prueba para la pantalla de Destinos.

export type DestinoEstado = "activo" | "error";

export type Destino = {
  id: string;
  nombre: string;
  tipo: "wordpress_cliente" | "sitio_propio";
  endpoint: string;
  estado: DestinoEstado;
  publicadas: number;
  ultimaPublicacion: string;
};

export const destinosData: Destino[] = [
  { id: "d1", nombre: "Diario Cliente A", tipo: "wordpress_cliente", endpoint: "diarioa.com/wp-json", estado: "activo", publicadas: 412, ultimaPublicacion: "hace 12 min" },
  { id: "d2", nombre: "Portal Cliente B", tipo: "wordpress_cliente", endpoint: "portalb.com/wp-json", estado: "activo", publicadas: 287, ultimaPublicacion: "hace 34 min" },
  { id: "d3", nombre: "Nuestro Sitio · Economía", tipo: "sitio_propio", endpoint: "feed/economia", estado: "activo", publicadas: 156, ultimaPublicacion: "hace 8 min" },
  { id: "d4", nombre: "Nuestro Sitio · Tecnología", tipo: "sitio_propio", endpoint: "feed/tecnologia", estado: "activo", publicadas: 98, ultimaPublicacion: "hace 1 h" },
  { id: "d5", nombre: "Diario Cliente C", tipo: "wordpress_cliente", endpoint: "diarioc.com/wp-json", estado: "error", publicadas: 64, ultimaPublicacion: "hace 5 h" },
];
