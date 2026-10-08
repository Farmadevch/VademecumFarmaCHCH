import { Download } from "lucide-react";
import { ImportadorExcel } from "@/components/panel/ImportadorExcel";

export const metadata = { title: "Importar · Panel" };

export default function ImportarPage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Importar medicamentos</h1>

      <section className="mb-6 max-w-3xl rounded-xl border border-line bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">Cómo funciona</h2>
        <ol className="grid list-decimal gap-1 pl-5">
          <li>Descargá la plantilla y completala (una fila por medicamento; si tiene varios lotes, repetí la fila con otro lote).</li>
          <li>Subí el archivo y revisá la previsualización: cada fila se valida antes de guardar nada.</li>
          <li>Confirmá. Las filas con error se omiten y se informan al final.</li>
        </ol>
        <ul className="mt-3 grid list-disc gap-1 pl-5 text-muted">
          <li>Un medicamento se identifica por <b>nombre genérico + concentración + forma</b>. Si ya existe, se actualiza; si no, se crea.</li>
          <li>Los laboratorios que no existan se crean solos.</li>
          <li>Los lotes nuevos se crean con su cantidad como un <b>ingreso</b> auditado. Si el lote ya existe, no se toca: el stock solo cambia con movimientos.</li>
          <li>Obligatorias: nombre genérico, concentración, forma y vía. Máximo 2000 filas y 5 MB.</li>
          <li>Si usás CSV, guardalo como <b>CSV UTF-8</b> para que se vean bien las tildes.</li>
        </ul>
        <a
          href="/api/exportar/plantilla"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-input-border bg-white px-4 font-medium hover:bg-chip"
        >
          <Download aria-hidden className="size-4" />
          Descargar plantilla
        </a>
      </section>

      <ImportadorExcel />
    </>
  );
}
