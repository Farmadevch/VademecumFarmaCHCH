import { Campo, FormSimple } from "@/components/panel/FormSimple";
import { inputClase } from "@/lib/ui";
import { requerirRol } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { actualizarUsuario, crearUsuario } from "./actions";

export const metadata = { title: "Usuarios · Panel" };

export default async function UsuariosPage() {
  const sesion = await requerirRol(["admin"]);

  const supabase = await createClient();
  const [perfiles, auth] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, rol, activo").order("nombre"),
    createAdminClient().auth.admin.listUsers({ perPage: 200 }),
  ]);
  const emails = new Map(auth.data.users.map((u) => [u.id, u.email]));

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Usuarios y roles</h1>

      <section className="mb-6 max-w-4xl rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold">Nuevo usuario</h2>
        <FormSimple action={crearUsuario} boton="Crear usuario" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <>
            <>
              <Campo id="u-nombre" etiqueta="Nombre" campo="nombre">
                <input id="u-nombre" name="nombre" required className={inputClase} />
              </Campo>
              <Campo id="u-email" etiqueta="Correo" campo="email">
                <input id="u-email" name="email" type="email" required autoComplete="off" className={inputClase} />
              </Campo>
              <Campo id="u-rol" etiqueta="Rol" campo="rol">
                <select id="u-rol" name="rol" defaultValue="farmacia" className={inputClase}>
                  <option value="farmacia">Farmacia</option>
                  <option value="admin">Admin</option>
                </select>
              </Campo>
              <Campo id="u-password" etiqueta="Contraseña temporal" campo="password">
                <input id="u-password" name="password" type="text" minLength={10} required autoComplete="off" className={`${inputClase} font-mono`} />
              </Campo>
            </>
          </>
        </FormSimple>
      </section>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line bg-chip text-muted">
            <tr>
              <th className="p-3 font-semibold">Nombre</th>
              <th className="p-3 font-semibold">Correo</th>
              <th className="p-3 font-semibold">Rol</th>
              <th className="p-3 font-semibold">Estado</th>
              <th className="p-3 font-semibold"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {(perfiles.data ?? []).map((p) => {
              const esYo = p.id === sesion.userId;
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-semibold">{p.nombre}{esYo && <span className="ml-2 text-xs font-medium text-muted">(vos)</span>}</td>
                  <td className="p-3">{emails.get(p.id) ?? "—"}</td>
                  <td className="p-3">
                    <form action={actualizarUsuario} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="activo" value={String(p.activo)} />
                      <label htmlFor={`rol-${p.id}`} className="sr-only">Rol de {p.nombre}</label>
                      <select id={`rol-${p.id}`} name="rol" defaultValue={p.rol} disabled={esYo} className="min-h-11 rounded-lg border border-input-border bg-white px-2">
                        <option value="farmacia">Farmacia</option>
                        <option value="admin">Admin</option>
                      </select>
                      {!esYo && <button className="min-h-11 rounded-lg border border-input-border px-3 font-medium">Guardar</button>}
                    </form>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 font-semibold ${p.activo ? "bg-ok-bg text-ok-text" : "bg-out-bg text-out-text"}`}>
                      {p.activo ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="p-3">
                    {!esYo && (
                      <form action={actualizarUsuario}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="rol" value={p.rol} />
                        <input type="hidden" name="activo" value={String(!p.activo)} />
                        <button className="min-h-11 rounded-lg border border-input-border px-3 font-medium">
                          {p.activo ? "Desactivar" : "Reactivar"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
