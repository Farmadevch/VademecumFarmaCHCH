import { requerirRol } from "@/lib/auth";
import { Campo, FormSimple } from "@/components/panel/FormSimple";
import { inputClase } from "@/lib/ui";
import { createClient } from "@/lib/supabase/server";
import { ConfirmarEliminar } from "@/components/panel/ConfirmarEliminar";
import { todas } from "@/lib/excel/importar";
import { eliminarLaboratorio, guardarLaboratorio } from "./actions";

export const metadata = { title: "Laboratorios · Panel" };

export default async function LaboratoriosPage({ searchParams }: PageProps<"/panel/laboratorios">) {
  const sesion = await requerirRol();
  const esAdmin = sesion.rol === "admin";
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  const supabase = await createClient();
  const [{ data }, meds] = await Promise.all([
    supabase.from("laboratorios").select("id, nombre").order("nombre"),
    todas<{ laboratorio_id: number | null }>((d, h) => supabase.from("medicamentos").select("laboratorio_id").order("id").range(d, h)),
  ]);
  const usados = new Map<number, number>();
  for (const m of meds) if (m.laboratorio_id) usados.set(m.laboratorio_id, (usados.get(m.laboratorio_id) ?? 0) + 1);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Laboratorios</h1>

      {ok && <p role="status" className="mb-4 max-w-xl rounded-lg bg-ok-bg p-3 text-sm text-ok-text">{ok}</p>}
      {error && <p role="alert" className="mb-4 max-w-xl rounded-lg bg-out-bg p-3 text-sm text-out-text">{error}</p>}

      <section className="mb-6 max-w-xl rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold">Nuevo laboratorio</h2>
        <FormSimple action={guardarLaboratorio} boton="Agregar" className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <>
            <Campo id="nombre-nuevo" etiqueta="Nombre" campo="nombre">
              <input id="nombre-nuevo" name="nombre" required className={inputClase} />
            </Campo>
          </>
        </FormSimple>
      </section>

      <ul className="grid max-w-xl gap-2">
        {(data ?? []).map((l) => (
          <li key={l.id} className="flex items-start gap-2 rounded-xl border border-line bg-white p-3">
            <FormSimple action={guardarLaboratorio} boton="Renombrar" className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto]">
              <>
                <>
                  <input type="hidden" name="id" value={l.id} />
                  <Campo id={`nombre-${l.id}`} etiqueta="Nombre" campo="nombre">
                    <input id={`nombre-${l.id}`} name="nombre" required defaultValue={l.nombre} className={inputClase} />
                  </Campo>
                </>
              </>
            </FormSimple>
            {esAdmin && (
              <div className="pt-6">
              <ConfirmarEliminar
                action={eliminarLaboratorio}
                id={l.id}
                nombre={l.nombre}
                titulo="¿Eliminar laboratorio?"
                mensaje="Esta acción no se puede deshacer. Los medicamentos no se ven afectados porque este laboratorio no tiene ninguno asociado."
                bloqueadoPor={usados.get(l.id) ? `tiene ${usados.get(l.id)} medicamento(s) asociado(s)` : undefined}
              />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
