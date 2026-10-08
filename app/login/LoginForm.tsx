"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoForm } from "./actions";

const inputClase =
  "min-h-11 w-full rounded-lg border border-input-border bg-white px-3 text-base focus:outline-2 focus:outline-primary";
const botonClase =
  "min-h-11 w-full rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark disabled:opacity-60";

export function LoginForm({ next }: { next?: string }) {
  const [estado, loginAction, pendiente] = useActionState<EstadoForm, FormData>(iniciarSesion, {});

  return (
    <form action={loginAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">Correo institucional</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClase} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClase} />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-lg bg-out-bg p-3 text-sm text-out-text">{estado.error}</p>
      )}

      <button type="submit" disabled={pendiente} className={botonClase}>
        Ingresar
      </button>
    </form>
  );
}
