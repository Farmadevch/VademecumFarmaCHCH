"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FORMAS, FORMA_LABEL, type OpcionesFiltros } from "@/types/publico";

const selectClase =
  "min-h-11 w-full rounded-lg border border-input-border bg-white px-3 text-base text-ink focus:outline-2 focus:outline-primary";

export function BuscadorFiltros({ opciones }: { opciones: OpcionesFiltros }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function actualizar(clave: string, valor: string) {
    const next = new URLSearchParams(params.toString());
    if (valor) next.set(clave, valor);
    else next.delete(clave);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function onBuscar(valor: string) {
    setQ(valor);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => actualizar("q", valor.trim()), 300);
  }

  const hayFiltros = ["lab", "forma", "conc", "cat", "estado"].some((k) => params.has(k));

  return (
    <div className="flex flex-col gap-4" aria-busy={pendiente}>
      <div className="relative">
        <label htmlFor="q" className="sr-only">
          Buscar medicamento
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          id="q"
          type="search"
          value={q}
          onChange={(e) => onBuscar(e.target.value)}
          placeholder="Buscá por nombre, principio activo o laboratorio"
          autoComplete="off"
          className="min-h-14 w-full rounded-xl border border-input-border bg-white pl-12 pr-4 text-lg focus:outline-2 focus:outline-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Campo id="estado" etiqueta="Disponibilidad">
          <select id="estado" className={selectClase} value={params.get("estado") ?? ""} onChange={(e) => actualizar("estado", e.target.value)}>
            <option value="">Todas</option>
            <option value="disponible">Disponible</option>
            <option value="bajo">Stock bajo</option>
            <option value="sin_stock">Sin stock</option>
          </select>
        </Campo>
        <Campo id="lab" etiqueta="Laboratorio">
          <select id="lab" className={selectClase} value={params.get("lab") ?? ""} onChange={(e) => actualizar("lab", e.target.value)}>
            <option value="">Todos</option>
            {opciones.laboratorios.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo id="forma" etiqueta="Forma">
          <select id="forma" className={selectClase} value={params.get("forma") ?? ""} onChange={(e) => actualizar("forma", e.target.value)}>
            <option value="">Todas</option>
            {FORMAS.map((f) => (
              <option key={f} value={f}>{FORMA_LABEL[f]}</option>
            ))}
          </select>
        </Campo>
        <Campo id="conc" etiqueta="Dosis">
          <select id="conc" className={selectClase} value={params.get("conc") ?? ""} onChange={(e) => actualizar("conc", e.target.value)}>
            <option value="">Todas</option>
            {opciones.concentraciones.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo id="cat" etiqueta="Categoría">
          <select id="cat" className={selectClase} value={params.get("cat") ?? ""} onChange={(e) => actualizar("cat", e.target.value)}>
            <option value="">Todas</option>
            {opciones.categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Campo>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => startTransition(() => router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false }))}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-input-border bg-white px-3 font-medium text-primary hover:bg-chip"
          >
            <X aria-hidden className="size-4" />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">{etiqueta}</label>
      {children}
    </div>
  );
}
