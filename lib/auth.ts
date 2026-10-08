import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "farmacia" | "admin";
export type Sesion = { userId: string; email: string | undefined; nombre: string; rol: Rol };

/** Devuelve la sesión con rol (leído de `perfiles`, no de user_metadata) o null. */
export async function obtenerSesion(): Promise<Sesion | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol, activo")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || !perfil.activo) return null;

  return { userId: user.id, email: user.email, nombre: perfil.nombre, rol: perfil.rol as Rol };
}

/** Para layouts y Server Actions del panel: exige sesión y, opcionalmente, un rol. */
export async function requerirRol(roles: Rol[] = ["farmacia", "admin"]): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (!roles.includes(sesion.rol)) redirect("/panel");
  return sesion;
}
