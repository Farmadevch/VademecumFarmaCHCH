"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerSesion, requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { erroresDeZod, mensajeDb, type EstadoAccion } from "@/lib/form";
import { laboratorioSchema } from "@/lib/validations/panel";

export async function guardarLaboratorio(_: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol();
  const parsed = laboratorioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroresDeZod(parsed.error);

  const supabase = await createClient();
  const { id, nombre } = parsed.data;
  const { error } = id
    ? await supabase.from("laboratorios").update({ nombre }).eq("id", id)
    : await supabase.from("laboratorios").insert({ nombre });
  if (error) return { error: mensajeDb(error) };

  revalidatePath("/", "layout");
  return { ok: id ? "Laboratorio actualizado." : "Laboratorio creado." };
}

export async function eliminarLaboratorio(formData: FormData) {
  const sesion = await obtenerSesion();
  const id = Number(formData.get("id"));
  const volver = (clave: "ok" | "error", texto: string): never =>
    redirect(`/panel/laboratorios?${clave}=${encodeURIComponent(texto)}`);
  // Solo admin: se chequea en el servidor, no solo ocultando el botón.
  if (!sesion) redirect("/login");
  if (sesion.rol !== "admin") volver("error", "Solo un administrador puede eliminar laboratorios.");
  if (!Number.isInteger(id) || id <= 0) volver("error", "Laboratorio inválido.");

  const supabase = await createClient();
  // .select() devuelve las filas borradas: si RLS lo bloquea no hay error pero sí 0 filas.
  const { data, error } = await supabase.from("laboratorios").delete().eq("id", id).select("nombre");

  if (error?.code === "23503")
    volver("error", "No se puede eliminar: tiene medicamentos asociados (incluso archivados). Reasignalos primero.");
  if (error || !data?.length) {
    console.error("eliminarLaboratorio", error ?? "0 filas eliminadas");
    volver("error", error ? mensajeDb(error) : "No se eliminó ningún laboratorio (revisá tus permisos).");
  }

  revalidatePath("/", "layout");
  volver("ok", `Laboratorio «${data![0].nombre}» eliminado.`);
}
