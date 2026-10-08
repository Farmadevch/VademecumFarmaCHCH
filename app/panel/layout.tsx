import Link from "next/link";
import { ArrowLeftRight, Boxes, FileUp, LayoutDashboard, LogOut, Pill, ScrollText, Tag, Users } from "lucide-react";
import { requerirRol } from "@/lib/auth";
import { cerrarSesion } from "@/app/login/actions";

const ENLACES = [
  { href: "/panel", etiqueta: "Inicio", Icono: LayoutDashboard },
  { href: "/panel/medicamentos", etiqueta: "Medicamentos", Icono: Pill },
  { href: "/panel/lotes", etiqueta: "Lotes", Icono: Boxes },
  { href: "/panel/movimientos", etiqueta: "Movimientos", Icono: ArrowLeftRight },
  { href: "/panel/laboratorios", etiqueta: "Laboratorios", Icono: Tag },
  { href: "/panel/importar", etiqueta: "Importar", Icono: FileUp },
];

const ENLACES_ADMIN = [
  { href: "/panel/usuarios", etiqueta: "Usuarios", Icono: Users },
  { href: "/panel/auditoria", etiqueta: "Auditoría", Icono: ScrollText },
];

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  // Chequeo de rol en el servidor: el proxy solo redirige a quien no tiene sesión.
  const sesion = await requerirRol();

  return (
    <div className="flex min-h-screen flex-col bg-ground-panel md:flex-row">
      <aside className="bg-sidebar text-white md:w-60 md:shrink-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3 md:block">
          <Link href="/panel" className="font-bold">Farmacia · Panel</Link>
          <p className="hidden text-sm text-white/70 md:mt-1 md:block">{sesion.nombre} · {sesion.rol}</p>
        </div>
        <nav aria-label="Panel" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {(sesion.rol === "admin" ? [...ENLACES, ...ENLACES_ADMIN] : ENLACES).map(({ href, etiqueta, Icono }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 hover:bg-white/10"
            >
              <Icono aria-hidden className="size-4" />
              {etiqueta}
            </Link>
          ))}
        </nav>
        <form action={cerrarSesion} className="px-2 pb-3 md:py-4">
          <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 hover:bg-white/10">
            <LogOut aria-hidden className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
