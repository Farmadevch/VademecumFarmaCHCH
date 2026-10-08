export type Estado = "disponible" | "bajo" | "sin_stock";

export const FORMAS = [
  "comprimido",
  "capsula",
  "suspension",
  "jarabe",
  "ampolla",
  "frasco_ampolla",
  "crema",
  "gotas",
  "supositorio",
  "inhalador",
  "otro",
] as const;
export type Forma = (typeof FORMAS)[number];

export const FORMA_LABEL: Record<Forma, string> = {
  comprimido: "Comprimido",
  capsula: "Cápsula",
  suspension: "Suspensión",
  jarabe: "Jarabe",
  ampolla: "Ampolla",
  frasco_ampolla: "Frasco ampolla",
  crema: "Crema",
  gotas: "Gotas",
  supositorio: "Supositorio",
  inhalador: "Inhalador",
  otro: "Otro",
};

/** Fila de la vista `medicamentos_publicos` (sin cantidades ni lotes). */
export type MedicamentoPublico = {
  id: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  laboratorio: string | null;
  laboratorio_id: number | null;
  concentracion: string;
  forma: Forma;
  via: string;
  categoria: string | null;
  controlado: boolean;
  lista_controlado: string | null;
  estado: Estado;
  updated_at: string;
};

export type OpcionesFiltros = {
  laboratorios: { id: number; nombre: string }[];
  categorias: string[];
  concentraciones: string[];
};
