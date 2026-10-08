"use client";

import { createContext, useActionState, useContext } from "react";
import type { EstadoAccion } from "@/lib/form";

const ErroresCtx = createContext<Record<string, string>>({});

/** Formulario genérico: muestra el mensaje de error/éxito de una Server Action. */
export function FormSimple({
  action,
  children,
  boton,
  className = "",
}: {
  action: (estado: EstadoAccion, formData: FormData) => Promise<EstadoAccion>;
  children: React.ReactNode;
  boton: string;
  className?: string;
}) {
  const [estado, formAction, pendiente] = useActionState<EstadoAccion, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      <ErroresCtx.Provider value={estado.campos ?? {}}>{children}</ErroresCtx.Provider>
      <div className="flex flex-col justify-end gap-2">
        <button
          disabled={pendiente}
          className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {boton}
        </button>
      </div>
      {estado.error && (
        <p role="alert" className="col-span-full rounded-lg bg-out-bg p-3 text-sm text-out-text">{estado.error}</p>
      )}
      {estado.ok && (
        <p role="status" className="col-span-full rounded-lg bg-ok-bg p-3 text-sm text-ok-text">{estado.ok}</p>
      )}
    </form>
  );
}

/** Campo con etiqueta; `campo` es el nombre del input y se usa para mostrar su error de validación. */
export function Campo({ id, etiqueta, campo, children }: { id: string; etiqueta: string; campo?: string; children: React.ReactNode }) {
  const error = useContext(ErroresCtx)[campo ?? ""];
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{etiqueta}</label>
      {children}
      {error && <p className="text-sm text-out-text">{error}</p>}
    </div>
  );
}
