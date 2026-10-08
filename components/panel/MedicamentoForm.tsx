"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { guardarMedicamento } from "@/app/panel/medicamentos/actions";
import type { EstadoAccion } from "@/lib/form";
import { FORMAS, FORMA_LABEL } from "@/types/publico";

export type MedicamentoEditable = {
  id: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  laboratorio_id: number | null;
  concentracion: string;
  forma: string;
  via: string;
  categoria: string | null;
  codigo_barras: string | null;
  stock_minimo: number;
  controlado: boolean;
  lista_controlado: string | null;
};

const input =
  "min-h-11 w-full rounded-lg border border-input-border bg-white px-3 text-base focus:outline-2 focus:outline-primary";

export function MedicamentoForm({
  medicamento,
  laboratorios,
}: {
  medicamento?: MedicamentoEditable;
  laboratorios: { id: number; nombre: string }[];
}) {
  const [estado, action, pendiente] = useActionState<EstadoAccion, FormData>(guardarMedicamento, {});
  const [controlado, setControlado] = useState(medicamento?.controlado ?? false);
  const m = medicamento;
  const err = estado.campos ?? {};

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      {m && <input type="hidden" name="id" value={m.id} />}

      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Identificación</legend>
        <Campo id="nombre_generico" etiqueta="Nombre genérico (principio activo)" error={err.nombre_generico}>
          <input id="nombre_generico" name="nombre_generico" required defaultValue={m?.nombre_generico} className={input} />
        </Campo>
        <Campo id="nombre_comercial" etiqueta="Nombre comercial" error={err.nombre_comercial}>
          <input id="nombre_comercial" name="nombre_comercial" defaultValue={m?.nombre_comercial ?? ""} className={input} />
        </Campo>
        <Campo id="laboratorio_id" etiqueta="Laboratorio" error={err.laboratorio_id}>
          <select id="laboratorio_id" name="laboratorio_id" defaultValue={m?.laboratorio_id ?? ""} className={input}>
            <option value="">Sin especificar</option>
            {laboratorios.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo id="categoria" etiqueta="Categoría terapéutica" error={err.categoria}>
          <input id="categoria" name="categoria" defaultValue={m?.categoria ?? ""} className={input} />
        </Campo>
        <Campo id="codigo_barras" etiqueta="Código de barras" error={err.codigo_barras}>
          <input id="codigo_barras" name="codigo_barras" inputMode="numeric" defaultValue={m?.codigo_barras ?? ""} className={`${input} font-mono`} />
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Presentación</legend>
        <Campo id="concentracion" etiqueta="Concentración" error={err.concentracion}>
          <input id="concentracion" name="concentracion" required placeholder="500 mg" defaultValue={m?.concentracion} className={`${input} font-mono`} />
        </Campo>
        <Campo id="forma" etiqueta="Forma farmacéutica" error={err.forma}>
          <select id="forma" name="forma" required defaultValue={m?.forma ?? ""} className={input}>
            <option value="" disabled>Elegí una forma</option>
            {FORMAS.map((f) => (
              <option key={f} value={f}>{FORMA_LABEL[f]}</option>
            ))}
          </select>
        </Campo>
        <Campo id="via" etiqueta="Vía de administración" error={err.via}>
          <input id="via" name="via" required placeholder="oral, IM, EV…" defaultValue={m?.via} className={input} />
        </Campo>
        <Campo id="stock_minimo" etiqueta="Stock mínimo" error={err.stock_minimo}>
          <input id="stock_minimo" name="stock_minimo" type="number" min={0} required defaultValue={m?.stock_minimo ?? 0} className={`${input} font-mono`} />
        </Campo>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Control especial</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="controlado"
            checked={controlado}
            onChange={(e) => setControlado(e.target.checked)}
            className="size-5"
          />
          Psicotrópico / estupefaciente (controlado)
        </label>
        {controlado && (
          <Campo id="lista_controlado" etiqueta="Lista" error={err.lista_controlado}>
            <input id="lista_controlado" name="lista_controlado" placeholder="I, II, III, IV…" defaultValue={m?.lista_controlado ?? ""} className={input} />
          </Campo>
        )}
      </fieldset>

      {!m && (
        <fieldset className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-3">
          <legend className="px-1 font-semibold">Primer lote (opcional)</legend>
          <Campo id="lote_nro" etiqueta="N.º de lote" error={err.lote_nro}>
            <input id="lote_nro" name="lote_nro" className={`${input} font-mono`} />
          </Campo>
          <Campo id="lote_vencimiento" etiqueta="Vencimiento" error={err.lote_vencimiento}>
            <input id="lote_vencimiento" name="lote_vencimiento" type="date" className={input} />
          </Campo>
          <Campo id="lote_cantidad" etiqueta="Cantidad inicial" error={err.lote_cantidad}>
            <input id="lote_cantidad" name="lote_cantidad" type="number" min={0} className={`${input} font-mono`} />
          </Campo>
        </fieldset>
      )}

      {estado.error && (
        <p role="alert" className="rounded-lg bg-out-bg p-3 text-sm text-out-text">{estado.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="min-h-11 rounded-lg bg-primary px-6 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {m ? "Guardar cambios" : "Crear medicamento"}
        </button>
        <Link href="/panel/medicamentos" className="inline-flex min-h-11 items-center rounded-lg border border-input-border bg-white px-6 font-medium">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{etiqueta}</label>
      {children}
      {error && <p className="text-sm text-out-text">{error}</p>}
    </div>
  );
}
