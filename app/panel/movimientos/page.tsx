import { Campo, FormSimple } from "@/components/panel/FormSimple";
import { inputClase } from "@/lib/ui";
import { fechaAR } from "@/lib/panel-data";
import { createClient } from "@/lib/supabase/server";
import { registrarMovimiento } from "./actions";

export const metadata = { title: "Movimientos · Panel" };

const TIPO_LABEL = { ingreso: "Ingreso", egreso: "Egreso", ajuste: "Ajuste", vencido: "Vencido" } as const;

export default async function MovimientosPage({ searchParams }: PageProps<"/panel/movimientos">) {
  const sp = await searchParams;
  const medId = Number(sp.medicamento);
  const filtrarMed = Number.isInteger(medId) && medId > 0 ? medId : null;

  const supabase = await createClient();
  let lotesQ = supabase
    .from("lotes")
    .select("id, nro_lote, vencimiento, cantidad, medicamento_id, medicamentos(nombre_generico, concentracion)")
    .order("vencimiento");
  if (filtrarMed) lotesQ = lotesQ.eq("medicamento_id", filtrarMed);

  const [lotes, movs] = await Promise.all([
    lotesQ,
    supabase
      .from("movimientos")
      .select("id, tipo, cantidad, sentido, motivo, created_at, lotes(nro_lote, medicamentos(nombre_generico, concentracion))")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  type L = { nombre_generico: string; concentracion: string };
  const nombreLote = (m: unknown) => m as L | null;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Movimientos</h1>

      <section className="mb-6 max-w-4xl rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold">Registrar movimiento</h2>
        <FormSimple action={registrarMovimiento} boton="Registrar" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <>
            <>
              <Campo id="lote_id" etiqueta="Lote" campo="lote_id">
                <select id="lote_id" name="lote_id" required defaultValue="" className={inputClase}>
                  <option value="" disabled>Elegí un lote</option>
                  {(lotes.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {nombreLote(l.medicamentos)?.nombre_generico} {nombreLote(l.medicamentos)?.concentracion} · {l.nro_lote} · vence {fechaAR(l.vencimiento)} · {l.cantidad} u.
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo id="tipo" etiqueta="Tipo" campo="tipo">
                <select id="tipo" name="tipo" required defaultValue="egreso" className={inputClase}>
                  {Object.entries(TIPO_LABEL).map(([v, t]) => (
                    <option key={v} value={v}>{t}</option>
                  ))}
                </select>
              </Campo>
              <Campo id="cantidad" etiqueta="Cantidad" campo="cantidad">
                <input id="cantidad" name="cantidad" type="number" min={1} required className={`${inputClase} font-mono`} />
              </Campo>
              <Campo id="sentido" etiqueta="Sentido (solo ajuste)" campo="sentido">
                <select id="sentido" name="sentido" defaultValue="1" className={inputClase}>
                  <option value="1">Suma (+)</option>
                  <option value="-1">Resta (−)</option>
                </select>
              </Campo>
              <Campo id="motivo" etiqueta="Motivo (obligatorio en ajustes)" campo="motivo">
                <input id="motivo" name="motivo" className={inputClase} />
              </Campo>
            </>
          </>
        </FormSimple>
      </section>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line bg-chip text-muted">
            <tr>
              <th className="p-3 font-semibold">Fecha</th>
              <th className="p-3 font-semibold">Medicamento</th>
              <th className="p-3 font-semibold">Lote</th>
              <th className="p-3 font-semibold">Tipo</th>
              <th className="p-3 text-right font-semibold">Cantidad</th>
              <th className="p-3 font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(movs.data ?? []).length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Todavía no hay movimientos.</td></tr>
            )}
            {(movs.data ?? []).map((m) => {
              const lote = m.lotes as unknown as { nro_lote: string; medicamentos: L | null } | null;
              const signo = m.tipo === "ingreso" || (m.tipo === "ajuste" && m.sentido === 1) ? "+" : "−";
              return (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{new Date(m.created_at!).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3">{lote?.medicamentos?.nombre_generico} <span className="font-mono text-muted">{lote?.medicamentos?.concentracion}</span></td>
                  <td className="p-3 font-mono">{lote?.nro_lote}</td>
                  <td className="p-3">{TIPO_LABEL[m.tipo as keyof typeof TIPO_LABEL]}</td>
                  <td className="p-3 text-right font-mono">{signo}{m.cantidad}</td>
                  <td className="p-3 text-muted">{m.motivo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
