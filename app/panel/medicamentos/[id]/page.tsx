import { notFound } from "next/navigation";
import { MedicamentoForm } from "@/components/panel/MedicamentoForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Editar medicamento · Panel" };

export default async function EditarMedicamento({
  params,
  searchParams,
}: PageProps<"/panel/medicamentos/[id]">) {
  const { id } = await params;
  const { lote_error } = await searchParams;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const supabase = await createClient();
  const [med, labs] = await Promise.all([
    supabase
      .from("medicamentos")
      .select("id, nombre_generico, nombre_comercial, laboratorio_id, concentracion, forma, via, categoria, codigo_barras, stock_minimo, controlado, lista_controlado")
      .eq("id", numId)
      .maybeSingle(),
    supabase.from("laboratorios").select("id, nombre").order("nombre"),
  ]);
  if (!med.data) notFound();

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Editar medicamento</h1>
      {typeof lote_error === "string" && (
        <p role="alert" className="mb-4 max-w-3xl rounded-lg bg-low-bg p-3 text-sm text-low-text">
          El medicamento se creó, pero el lote no: {lote_error}. Cargalo desde Lotes.
        </p>
      )}
      <MedicamentoForm medicamento={med.data} laboratorios={labs.data ?? []} />
    </>
  );
}
