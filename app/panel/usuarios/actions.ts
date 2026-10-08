"use server";

import { revalidatePath } from "next/cache";
import { requerirRol } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { erroresDeZod, type EstadoAccion } from "@/lib/form";
import { usuarioSchema } from "@/lib/validations/panel";

export async function crearUsuario(_: EstadoAccion, formData: FormData): Promise<EstadoAccion> {
  await requerirRol(["admin"]);
  const parsed = usuarioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return erroresDeZod(parsed.error);
  const { email, nombre, rol, password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    const existe = error?.message.toLowerCase().includes("already");
    return { error: existe ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario." };
  }

  const { error: errPerfil } = await admin.from("perfiles").insert({ id: data.user.id, nombre, rol });
  if (errPerfil) {
    // Sin perfil el usuario no podría entrar a nada: no dejamos la cuenta huérfana.
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "No se pudo crear el perfil. Probá de nuevo." };
  }

  revalidatePath("/panel/usuarios");
  return { ok: `Usuario creado. Pasale la contraseña temporal a ${nombre} y pedile que la cambie.` };
}

export async function actualizarUsuario(formData: FormData) {
  const sesion = await requerirRol(["admin"]);
  const id = String(formData.get("id") ?? "");
  const rol = formData.get("rol");
  const activo = formData.get("activo") === "true";

  // Evita que el admin se quite el acceso a sí mismo.
  if (!id || id === sesion.userId) return;
  if (rol !== "farmacia" && rol !== "admin") return;

  const supabase = await createClient();
  await supabase.from("perfiles").update({ rol, activo }).eq("id", id);
  revalidatePath("/panel/usuarios");
}
