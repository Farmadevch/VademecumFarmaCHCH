/** Tipos compartidos entre las Server Actions de importación y el componente de cliente. */

export type EstadoFila = "nuevo" | "actualiza" | "lote" | "error";

export type FilaPrevia = {
  fila: number; // número de fila en el Excel
  estado: EstadoFila;
  errores: string[];
  resumen: { generico: string; concentracion: string; forma: string; laboratorio: string; lote: string };
  datos?: unknown; // fila ya normalizada (solo si es válida)
};

export type EstadoPrevia = { error?: string; archivo?: string; filas?: FilaPrevia[] };

export type ResultadoImport = {
  error?: string;
  creados: number;
  actualizados: number;
  lotesCreados: number;
  lotesOmitidos: number;
  errores: { fila: number; mensaje: string }[];
};

export type EstadoConfirmacion = { error?: string; resultado?: ResultadoImport };
