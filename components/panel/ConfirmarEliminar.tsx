"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

function BotonEliminar() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="min-h-11 rounded-lg bg-out-ring px-5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}

/** Botón de eliminar con ventana de confirmación (<dialog> nativo: Esc cierra y el foco queda dentro). */
export function ConfirmarEliminar({
  action,
  id,
  nombre,
  titulo,
  mensaje,
  bloqueadoPor,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: number;
  nombre: string;
  titulo: string;
  mensaje: string;
  /** Si está definido, el botón queda deshabilitado y este texto explica por qué. */
  bloqueadoPor?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        disabled={!!bloqueadoPor}
        title={bloqueadoPor ?? "Eliminar"}
        aria-label={`Eliminar ${nombre}${bloqueadoPor ? ` (no disponible: ${bloqueadoPor})` : ""}`}
        className="grid size-11 shrink-0 place-items-center rounded-lg border border-input-border bg-white text-out-text hover:bg-out-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
      >
        <Trash2 aria-hidden className="size-4" />
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={`titulo-eliminar-${id}`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-white p-0 text-ink backdrop:bg-black/50"
      >
        <form action={action} className="flex flex-col gap-4 p-5">
          <input type="hidden" name="id" value={id} />
          <h2 id={`titulo-eliminar-${id}`} className="text-lg font-bold">{titulo}</h2>
          <p className="text-sm text-muted">
            <b className="text-ink">{nombre}</b> — {mensaje}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="min-h-11 rounded-lg border border-input-border bg-white px-5 font-medium hover:bg-chip"
            >
              Cancelar
            </button>
            <BotonEliminar />
          </div>
        </form>
      </dialog>
    </>
  );
}
