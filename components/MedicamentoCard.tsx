import { ShieldAlert } from "lucide-react";
import { EstadoBadge } from "@/components/EstadoBadge";
import { FORMA_LABEL, type MedicamentoPublico } from "@/types/publico";

export function MedicamentoCard({ m }: { m: MedicamentoPublico }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight">{m.nombre_generico}</h3>
          {m.nombre_comercial && (
            <p className="text-sm text-muted">{m.nombre_comercial}</p>
          )}
        </div>
        <EstadoBadge estado={m.estado} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-chip px-3 py-1 font-mono">{m.concentracion}</span>
        <span className="rounded-full bg-chip px-3 py-1">{FORMA_LABEL[m.forma]}</span>
        <span className="rounded-full bg-chip px-3 py-1">Vía {m.via}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{m.laboratorio ?? "Laboratorio sin especificar"}</span>
        {m.controlado && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ctrl-bg px-3 py-1 font-semibold text-ctrl-text">
            <ShieldAlert aria-hidden className="size-4" />
            Controlado{m.lista_controlado ? ` · Lista ${m.lista_controlado}` : ""}
          </span>
        )}
      </div>
    </li>
  );
}
