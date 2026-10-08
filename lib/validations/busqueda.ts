import { z } from "zod";
import { FORMAS } from "@/types/publico";

const vacioANada = (v: unknown) => (v === "" ? undefined : v);

/** Parámetros de la URL del buscador público. */
export const busquedaSchema = z.object({
  q: z.preprocess(vacioANada, z.string().trim().max(100).optional()),
  lab: z.preprocess(vacioANada, z.coerce.number().int().positive().optional()),
  forma: z.preprocess(vacioANada, z.enum(FORMAS).optional()),
  conc: z.preprocess(vacioANada, z.string().max(50).optional()),
  cat: z.preprocess(vacioANada, z.string().max(80).optional()),
  estado: z.preprocess(vacioANada, z.enum(["disponible", "bajo", "sin_stock"]).optional()),
});

export type Busqueda = z.infer<typeof busquedaSchema>;
