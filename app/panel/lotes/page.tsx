import Link from "next/link";
import { Campo, FormSimple } from "@/components/panel/FormSimple";
import { inputClase } from "@/lib/ui";
import { diasHasta, fechaAR } from "@/lib/panel-data";
import { createClient } from "@/lib/supabase/server";
import { crearLote } from "./actions";

export const metadata = { title: "Lotes · Panel" };

const VENTANAS = [30, 60, 90];

export default async function LotesPage({ searchParams }: PageProps<"/panel/lotes">) {
  const sp = await searchParams;
  const dias = VENTANAS.includes(Number(sp.dias)) ? Number(sp.dias) : null;

  const supabase = await createClient();
  const [lotes, meds] = await Promise.all([
    supabase
      .from("lotes")
      .select("id, nro_lote, vencimiento, cantidad, medicamentos(nombre_generico, concentracion)")
      .order("vencimiento"),
    supabase.from("medicamentos").select("id, nombre_generico, concentracion").eq("activo", true).order("nombre_generico"),
  ]);

  const filas = (lotes.data ?? [])
    .map((l) => ({ ...l, restan: diasHasta(l.vencimiento), med: l.medicamentos as unknown as { nombre_generico: string; concentracion: string } | null }))
    .filter((l) => (dias === null ? true : l.cantidad > 0 && l.restan <= dias));

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Lotes y vencimientos</h1>

      <section className="mb-6 max-w-4xl rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold">Nuevo lote</h2>
        <FormSimple action={crearLote} boton="Crear lote" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <>
            <>
              <Campo id="medicamento_id" etiqueta="Medicamento" campo="medicamento_id">
                <select id="medicamento_id" name="medicamento_id" required defaultValue="" className={inputClase}>
                  <option value="" disabled>Elegí uno</option>
                  {(meds.data ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre_generico} {m.concentracion}</option>
                  ))}
                </select>
              </Campo>
              <Campo id="nro_lote" etiqueta="N.º de lote" campo="nro_lote">
                <input id="nro_lote" name="nro_lote" required className={`${inputClase} font-mono`} />
              </Campo>
              <Campo id="vencimiento" etiqueta="Vencimiento" campo="vencimiento">
                <input id="vencimiento" name="vencimiento" type="date" required className={inputClase} />
              </Campo>
              <Campo id="cantidad" etiqueta="Cantidad inicial" campo="cantidad">
                <input id="cantidad" name="cantidad" type="number" min={0} defaultValue={0} required className={`${inputClase} font-mono`} />
              </Campo>
            </>
          </>
        </FormSimple>
      </section>

      <nav aria-label="Filtro de vencimiento" className="mb-4 flex flex-wrap gap-2">
        <Chip href="/panel/lotes" activo={dias === null}>Todos</Chip>
        {VENTANAS.map((d) => (
          <Chip key={d} href={`/panel/lotes?dias=${d}`} activo={dias === d}>Vencen en ≤ {d} días</Chip>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm md:min-w-[40rem]">
          <thead className="border-b border-line bg-chip text-muted max-md:hidden">
            <tr>
              <th className="p-3 font-semibold">Medicamento</th>
              <th className="p-3 font-semibold">Lote</th>
              <th className="p-3 font-semibold">Vencimiento</th>
              <th className="p-3 text-right font-semibold">Cantidad</th>
              <th className="p-3 font-semibold">Situación</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr className="max-md:block"><td colSpan={5} className="p-6 max-md:block text-center text-muted">No hay lotes para mostrar.</td></tr>
            )}
            {filas.map((l) => (
              <tr key={l.id} className="border-b border-line last:border-0 max-md:block max-md:p-3">
                <td className="p-3 font-semibold max-md:block max-md:px-0 max-md:pt-0">{l.med?.nombre_generico} <span className="font-mono font-medium text-muted">{l.med?.concentracion}</span></td>
                <td data-label="Lote" className="p-3 font-mono max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{l.nro_lote}</td>
                <td data-label="Vencimiento" className="p-3 font-mono max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{fechaAR(l.vencimiento)}</td>
                <td data-label="Cantidad" className="p-3 text-right font-mono max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{l.cantidad}</td>
                <td data-label="Situación" className="p-3 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">
                  {l.restan < 0 ? (
                    <span className="rounded-full bg-out-bg px-3 py-1 font-semibold text-out-text">Vencido</span>
                  ) : l.restan <= 30 ? (
                    <span className="rounded-full bg-low-bg px-3 py-1 font-semibold text-low-text">Vence en {l.restan} días</span>
                  ) : (
                    <span className="text-muted">Vigente ({l.restan} días)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${activo ? "border-primary bg-primary text-white" : "border-input-border bg-white"}`}
    >
      {children}
    </Link>
  );
}
