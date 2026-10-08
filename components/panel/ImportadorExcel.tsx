"use client";

import { useActionState } from "react";
import { confirmarImportacion, previsualizar } from "@/app/panel/importar/actions";
import type { EstadoConfirmacion, EstadoFila, EstadoPrevia } from "@/lib/excel/tipos";

const ETIQUETA: Record<EstadoFila, { texto: string; clases: string }> = {
  nuevo: { texto: "Nuevo", clases: "bg-ok-bg text-ok-text" },
  actualiza: { texto: "Actualiza", clases: "bg-chip text-primary" },
  lote: { texto: "Lote adicional", clases: "bg-chip text-primary" },
  error: { texto: "Error", clases: "bg-out-bg text-out-text" },
};

export function ImportadorExcel() {
  const [previa, previsualizarAction, previsualizando] = useActionState<EstadoPrevia, FormData>(previsualizar, {});
  const [conf, confirmarAction, importando] = useActionState<EstadoConfirmacion, FormData>(confirmarImportacion, {});

  const filas = previa.filas ?? [];
  const validas = filas.filter((f) => f.estado !== "error");
  const conteo = (e: EstadoFila) => filas.filter((f) => f.estado === e).length;
  const r = conf.resultado;

  return (
    <div className="flex flex-col gap-6">
      <form action={previsualizarAction} className="flex max-w-xl flex-col gap-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="archivo" className="text-sm font-medium">Archivo Excel o CSV</label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            className="min-h-11 w-full rounded-lg border border-input-border bg-white p-2 text-sm"
          />
        </div>
        <button
          disabled={previsualizando}
          className="min-h-11 self-start rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {previsualizando ? "Leyendo archivo…" : "Previsualizar"}
        </button>
        {previa.error && (
          <p role="alert" className="rounded-lg bg-out-bg p-3 text-sm text-out-text">{previa.error}</p>
        )}
      </form>

      {filas.length > 0 && !r && (
        <section aria-labelledby="titulo-previa" className="flex flex-col gap-4">
          <h2 id="titulo-previa" className="text-lg font-semibold">Previsualización de {previa.archivo}</h2>

          <ul className="flex flex-wrap gap-2 text-sm font-semibold">
            <li className="rounded-full bg-ok-bg px-3 py-1 text-ok-text">{conteo("nuevo")} nuevos</li>
            <li className="rounded-full bg-chip px-3 py-1 text-primary">{conteo("actualiza")} a actualizar</li>
            <li className="rounded-full bg-chip px-3 py-1 text-primary">{conteo("lote")} lotes adicionales</li>
            <li className="rounded-full bg-out-bg px-3 py-1 text-out-text">{conteo("error")} con error</li>
          </ul>

          <div className="max-h-[28rem] overflow-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="sticky top-0 border-b border-line bg-chip text-muted">
                <tr>
                  <th className="p-3 font-semibold">Fila</th>
                  <th className="p-3 font-semibold">Estado</th>
                  <th className="p-3 font-semibold">Medicamento</th>
                  <th className="p-3 font-semibold">Laboratorio</th>
                  <th className="p-3 font-semibold">Lote</th>
                  <th className="p-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.fila} className="border-b border-line align-top last:border-0">
                    <td className="p-3 font-mono">{f.fila}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-3 py-1 font-semibold ${ETIQUETA[f.estado].clases}`}>{ETIQUETA[f.estado].texto}</span>
                    </td>
                    <td className="p-3">
                      {f.resumen.generico || "—"} <span className="font-mono text-muted">{f.resumen.concentracion}</span>
                    </td>
                    <td className="p-3">{f.resumen.laboratorio || "—"}</td>
                    <td className="p-3 font-mono">{f.resumen.lote || "—"}</td>
                    <td className="p-3 text-out-text">{f.errores.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {validas.length > 0 ? (
            <form action={confirmarAction} className="flex flex-col gap-3">
              <input
                type="hidden"
                name="filas"
                value={JSON.stringify(validas.map((f) => ({ fila: f.fila, datos: f.datos })))}
              />
              <p className="text-sm text-muted">
                Se importarán {validas.length} filas.{" "}
                {conteo("error") > 0 && "Las filas con error se omiten: corregilas en el archivo y subilo de nuevo."}
              </p>
              <button
                disabled={importando}
                className="min-h-11 self-start rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {importando ? "Importando…" : `Confirmar importación (${validas.length} filas)`}
              </button>
              {conf.error && <p role="alert" className="rounded-lg bg-out-bg p-3 text-sm text-out-text">{conf.error}</p>}
            </form>
          ) : (
            <p className="rounded-lg bg-low-bg p-3 text-sm text-low-text">No hay filas válidas para importar.</p>
          )}
        </section>
      )}

      {r && (
        <section aria-live="polite" className="flex max-w-3xl flex-col gap-3 rounded-xl border border-line bg-white p-4">
          <h2 className="text-lg font-semibold">Importación terminada</h2>
          <ul className="grid gap-1 text-sm">
            <li><span className="font-mono">{r.creados}</span> medicamentos creados</li>
            <li><span className="font-mono">{r.actualizados}</span> medicamentos actualizados</li>
            <li><span className="font-mono">{r.lotesCreados}</span> lotes creados</li>
            {r.lotesOmitidos > 0 && (
              <li><span className="font-mono">{r.lotesOmitidos}</span> lotes omitidos porque ya existían (el stock se cambia con movimientos)</li>
            )}
          </ul>
          {r.errores.length > 0 && (
            <div className="rounded-lg bg-out-bg p-3 text-sm text-out-text">
              <p className="mb-1 font-semibold">{r.errores.length} filas no se importaron:</p>
              <ul className="max-h-48 overflow-auto">
                {r.errores.map((e, i) => (
                  <li key={i}>Fila {e.fila}: {e.mensaje}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
