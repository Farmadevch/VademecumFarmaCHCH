"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { erroresDeZod, mensajeDb, type EstadoAccion } from "@/lib/form";
import { medicamentoSchema } from "@/lib/validations/panel";

export async function guardarMedicamento(_: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol();

  const parsed = medicamentoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroresDeZod(parsed.error);
  const { id, lote_nro, lote_vencimiento, lote_cantidad, ...datos } = parsed.data;

  const fila = {
    nombre_generico: datos.nombre_generico,
    nombre_comercial: datos.nombre_comercial ?? null,
    laboratorio_id: datos.laboratorio_id ?? null,
    concentracion: datos.concentracion,
    forma: datos.forma,
    via: datos.via,
    categoria: datos.categoria ?? null,
    codigo_barras: datos.codigo_barras ?? null,
    stock_minimo: datos.stock_minimo,
    controlado: datos.controlado,
    lista_controlado: datos.controlado ? (datos.lista_controlado ?? null) : null,
  };

  const supabase = await createClient();

  if (id) {
    const { error } = await supabase.from("medicamentos").update(fila).eq("id", id);
    if (error) return { error: mensajeDb(error) };
  } else {
    const { data, error } = await supabase.from("medicamentos").insert(fila).select("id").single();
    if (error) return { error: mensajeDb(error) };

    if (lote_nro && lote_vencimiento) {
      const { error: errLote } = await supabase.rpc("crear_lote", {
        p_medicamento_id: data.id,
        p_nro_lote: lote_nro,
        p_vencimiento: lote_vencimiento,
        p_cantidad: lote_cantidad ?? 0,
      });
      if (errLote) {
        // El medicamento ya quedó creado: lo mandamos a editar para que cargue el lote.
        redirect(`/panel/medicamentos/${data.id}?lote_error=${encodeURIComponent(mensajeDb(errLote))}`);
      }
    }
  }

  revalidatePath("/", "layout");
  redirect("/panel/medicamentos");
}

export async function cambiarEstadoMedicamento(formData: FormData) {
  await requerirRol();
  const id = Number(formData.get("id"));
  const activo = formData.get("activo") === "true";
  if (!Number.isInteger(id) || id <= 0) redirect("/panel/medicamentos?error=" + encodeURIComponent("Medicamento inválido."));

  const supabase = await createClient();
  // .select() devuelve las filas modificadas: si RLS bloquea el update no hay error pero sí 0 filas.
  const { data, error } = await supabase.from("medicamentos").update({ activo }).eq("id", id).select("id, nombre_generico");

  if (error || !data?.length) {
    console.error("cambiarEstadoMedicamento", error ?? "0 filas actualizadas");
    const motivo = error ? mensajeDb(error) : "No se modificó ninguna fila (revisá tus permisos).";
    redirect("/panel/medicamentos?error=" + encodeURIComponent(motivo));
  }

  revalidatePath("/", "layout");
  const verbo = activo ? "reactivado" : "archivado";
  redirect("/panel/medicamentos?ok=" + encodeURIComponent(`${data[0].nombre_generico} ${verbo}.`) + (activo ? "&archivados=1" : ""));
}
