import { requerirRol } from "@/lib/auth";
import { cerrarSesion } from "@/app/login/actions";
import { PanelMenu } from "@/components/panel/PanelMenu";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  // Chequeo de rol en el servidor: el proxy solo redirige a quien no tiene sesión.
  const sesion = await requerirRol();

  return (
    <div className="flex min-h-screen flex-col bg-ground-panel md:flex-row">
      <aside className="bg-sidebar text-white md:w-60 md:shrink-0">
        <PanelMenu nombre={sesion.nombre} rol={sesion.rol} cerrarSesion={cerrarSesion} />
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
