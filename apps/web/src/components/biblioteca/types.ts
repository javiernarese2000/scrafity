import type { BadgeProps } from "@/components/ui/badge";

export type EstadoNota =
  | "en_revision"
  | "aprobada"
  | "publicada"
  | "archivada"
  | "rechazada";

export type NotaCard = {
  id: string;
  titulo: string;
  fuente: string;
  fecha: string;
  imagenUrl: string | null;
  estado: EstadoNota;
  tags: string[];
  nVersiones: number;
  similarity: number | null;
  destinos: number;
  archivada: boolean;
};

export type NotaDetalleData = {
  id: string;
  titulo: string;
  fuente: string;
  fecha: string;
  urlOriginal: string;
  imagenUrl: string | null;
  estado: EstadoNota;
  archivada: boolean;
  tags: string[];
  original: string;
  contenido: string;
  nVersiones: number;
};

export function deriveEstado(
  archivada: boolean,
  estados: string[],
): EstadoNota {
  if (archivada) return "archivada";
  if (estados.includes("publicada")) return "publicada";
  if (estados.includes("aprobada")) return "aprobada";
  if (estados.includes("en_revision")) return "en_revision";
  return "rechazada";
}

export function estadoInfo(e: EstadoNota): {
  label: string;
  tone: NonNullable<BadgeProps["tone"]>;
} {
  switch (e) {
    case "en_revision":
      return { label: "En revisión", tone: "warning" };
    case "aprobada":
      return { label: "Aprobada", tone: "brand" };
    case "publicada":
      return { label: "Publicada", tone: "success" };
    case "archivada":
      return { label: "Archivada", tone: "neutral" };
    case "rechazada":
      return { label: "Rechazada", tone: "danger" };
  }
}
