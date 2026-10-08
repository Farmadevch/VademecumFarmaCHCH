"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

export type EstadoForm = { error?: string; ok?: string };

function destinoSeguro(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  // Solo rutas internas del panel: evita open redirect.
  return n.startsWith("/panel") && !n.startsWith("//") ? n : "/panel";
}

export async function iniciarSesion(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Correo o contraseña incorrectos." };

  redirect(destinoSeguro(formData.get("next")));
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
