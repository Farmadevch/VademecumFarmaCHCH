"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { erroresDeZod, mensajeDb, type EstadoAccion } from "@/lib/form";
import { movimientoSchema } from "@/lib/validations/panel";

export async function registrarMovimiento(_: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  const sesion = await requerirRol();
  const parsed = movimientoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroresDeZod(parsed.error);
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("movimientos").insert({
    lote_id: d.lote_id,
    tipo: d.tipo,
    cantidad: d.cantidad,
    sentido: d.tipo === "ajuste" ? d.sentido : 1,
    motivo: d.motivo ?? null,
    usuario_id: sesion.userId,
  });
  if (error) return { error: mensajeDb(error) };

  revalidatePath("/", "layout");
  return { ok: "Movimiento registrado." };
}
