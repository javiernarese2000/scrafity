export type ProveedorView = "deepseek" | "claude" | "auto";

export type VersionView = {
  id: string;
  titulo: string;
  contenido: string;
  similarity: number;
  proveedor: ProveedorView | null;
  tokensIn: number | null;
  tokensOut: number | null;
};

export type NotaView = {
  id: string;
  titulo: string;
  fuente: string;
  autor: string | null;
  fecha: string;
  urlOriginal: string;
  original: string;
  imagenUrl: string | null;
  versiones: VersionView[];
};

export function proveedorLabel(p: ProveedorView | null): string {
  if (p === "deepseek") return "DeepSeek";
  if (p === "claude") return "Claude";
  return "IA";
}
