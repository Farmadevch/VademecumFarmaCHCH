"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { analizar, aplicar, leerArchivo, MAX_BYTES, MAX_FILAS, type FilaCruda } from "@/lib/excel/importar";
import type { EstadoConfirmacion, EstadoPrevia, FilaPrevia } from "@/lib/excel/tipos";

const EXTENSIONES = [".xlsx", ".xls", ".csv"];

export async function previsualizar(_: EstadoPrevia, formData: FormData): Promise<EstadoPrevia> {
  await requerirRol();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí un archivo Excel o CSV." };
  if (!EXTENSIONES.some((e) => archivo.name.toLowerCase().endsWith(e)))
    return { error: "Formato no admitido. Usá .xlsx, .xls o .csv." };
  if (archivo.size > MAX_BYTES) return { error: "El archivo supera los 5 MB." };

  try {
    const filas = leerArchivo(Buffer.from(await archivo.arrayBuffer()), archivo.name);
    const supabase = await createClient();
    const analizadas = await analizar(supabase, filas);
    return { archivo: archivo.name, filas: analizadas.map((f): FilaPrevia => ({ fila: f.fila, estado: f.estado, errores: f.errores, resumen: f.resumen, datos: f.datos })) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo procesar el archivo." };
  }
}

export async function confirmarImportacion(_: EstadoConfirmacion, formData: FormData): Promise<EstadoConfirmacion> {
  await requerirRol();

  // Lo que manda el navegador no es de confianza: se vuelve a validar y analizar todo en el servidor.
  let items: FilaCruda[];
  try {
    const bruto: unknown = JSON.parse(String(formData.get("filas") ?? "[]"));
    if (!Array.isArray(bruto) || bruto.length === 0 || bruto.length > MAX_FILAS) throw new Error();
    items = bruto.map((x) => {
      const o = x as { fila?: unknown; datos?: unknown };
      if (typeof o.fila !== "number" || typeof o.datos !== "object" || o.datos === null) throw new Error();
      return { fila: o.fila, crudo: o.datos as FilaCruda["crudo"] };
    });
  } catch {
    return { error: "No hay filas válidas para importar. Volvé a previsualizar el archivo." };
  }

  try {
    const supabase = await createClient();
    const resultado = await aplicar(supabase, await analizar(supabase, items));
    revalidatePath("/", "layout");
    return { resultado };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo completar la importación." };
  }
}
