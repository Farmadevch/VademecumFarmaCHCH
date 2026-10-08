"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { erroresDeZod, mensajeDb, type EstadoAccion } from "@/lib/form";
import { loteSchema } from "@/lib/validations/panel";

export async function crearLote(_: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol();
  const parsed = loteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroresDeZod(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_lote", {
    p_medicamento_id: parsed.data.medicamento_id,
    p_nro_lote: parsed.data.nro_lote,
    p_vencimiento: parsed.data.vencimiento,
    p_cantidad: parsed.data.cantidad,
  });
  if (error) return { error: mensajeDb(error) };

  revalidatePath("/", "layout");
  return { ok: "Lote creado." };
}
