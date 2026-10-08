import { requerirRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Auditoría · Panel" };

const ACCION: Record<string, string> = {
  insert: "Alta",
  update: "Modificación",
  delete: "Baja",
  archive: "Archivado",
};

function resumen(a: { tabla: string; datos_antes: Record<string, unknown> | null; datos_despues: Record<string, unknown> | null }) {
  const d = a.datos_despues ?? a.datos_antes ?? {};
  if (a.tabla === "medicamentos") return `${d.nombre_generico ?? ""} ${d.concentracion ?? ""}`.trim();
  if (a.tabla === "lotes") {
    const antes = a.datos_antes?.cantidad;
    const desp = a.datos_despues?.cantidad;
    return `Lote ${d.nro_lote ?? ""}${antes !== undefined && desp !== undefined && antes !== desp ? ` · cantidad ${antes} → ${desp}` : ""}`;
  }
  if (a.tabla === "perfiles") return `${d.nombre ?? ""} (${d.rol ?? ""})`;
  return "";
}

export default async function AuditoriaPage() {
  await requerirRol(["admin"]);
  const supabase = await createClient();

  const [log, perfiles] = await Promise.all([
    supabase
      .from("auditoria")
      .select("id, tabla, registro_id, accion, datos_antes, datos_despues, usuario_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("perfiles").select("id, nombre"),
  ]);
  const nombres = new Map((perfiles.data ?? []).map((p) => [p.id, p.nombre]));

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Auditoría</h1>
      <p className="mb-4 text-sm text-muted">Últimas 200 acciones sobre medicamentos, lotes y usuarios.</p>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-line bg-chip text-muted">
            <tr>
              <th className="p-3 font-semibold">Fecha</th>
              <th className="p-3 font-semibold">Usuario</th>
              <th className="p-3 font-semibold">Acción</th>
              <th className="p-3 font-semibold">Tabla</th>
              <th className="p-3 font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(log.data ?? []).length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted">Sin registros.</td></tr>
            )}
            {(log.data ?? []).map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="p-3 font-mono">{new Date(a.created_at!).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{a.usuario_id ? (nombres.get(a.usuario_id) ?? "Usuario eliminado") : "Sistema"}</td>
                <td className="p-3">{ACCION[a.accion] ?? a.accion}</td>
                <td className="p-3">{a.tabla}</td>
                <td className="p-3 text-muted">
                  {resumen({
                    tabla: a.tabla,
                    datos_antes: a.datos_antes as Record<string, unknown> | null,
                    datos_despues: a.datos_despues as Record<string, unknown> | null,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
