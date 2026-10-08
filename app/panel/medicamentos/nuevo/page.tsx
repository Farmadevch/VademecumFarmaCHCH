import { MedicamentoForm } from "@/components/panel/MedicamentoForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nuevo medicamento · Panel" };

export default async function NuevoMedicamento() {
  const supabase = await createClient();
  const { data } = await supabase.from("laboratorios").select("id, nombre").order("nombre");

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Nuevo medicamento</h1>
      <MedicamentoForm laboratorios={data ?? []} />
    </>
  );
}
