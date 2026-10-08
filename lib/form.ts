import type { ZodError } from "zod";

export type EstadoAccion = {
  error?: string;
  ok?: string;
  campos?: Record<string, string>;
};

export function erroresDeZod(e: ZodError): EstadoAccion {
  const campos: Record<string, string> = {};
  for (const i of e.issues) {
    const k = String(i.path[0] ?? "");
    if (k && !campos[k]) campos[k] = i.message;
  }
  return { error: "Revisá los campos marcados.", campos };
}

/** Traduce errores de Postgres comunes a mensajes para el usuario. */
export function mensajeDb(e: { code?: string; message: string }): string {
  if (e.code === "23505") return "Ya existe un registro con ese valor (duplicado).";
  if (e.code === "23503") return "Referencia inválida.";
  if (e.code === "42501") return "No tenés permiso para hacer esto.";
  // Mensajes propios de los triggers (stock insuficiente, etc.)
  if (e.code === "P0001") return e.message;
  return "No se pudo guardar. Probá de nuevo.";
}
