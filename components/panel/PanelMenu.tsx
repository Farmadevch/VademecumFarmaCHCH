"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, Boxes, FileUp, LayoutDashboard, LogOut, Menu, Pill, ScrollText, Tag, Users, X } from "lucide-react";

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

export function PanelMenu({
  nombre,
  rol,
  cerrarSesion,
}: {
  nombre: string;
  rol: string;
  cerrarSesion: () => void | Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const enlaces = rol === "admin" ? [...ENLACES, ...ENLACES_ADMIN] : ENLACES;

  useEffect(() => setAbierto(false), [pathname]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-2 md:block md:py-3">
        <Link href="/panel" className="font-bold">Farmacia · Panel</Link>
        <p className="hidden text-sm text-white/70 md:mt-1 md:block">{nombre} · {rol}</p>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-panel"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="grid size-11 place-items-center rounded-lg hover:bg-white/10 md:hidden"
        >
          {abierto ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        </button>
      </div>

      <div id="menu-panel" className={`${abierto ? "block" : "hidden"} border-t border-white/10 md:block md:border-0`}>
        <p className="px-4 py-2 text-sm text-white/70 md:hidden">{nombre} · {rol}</p>
        <nav aria-label="Panel" className="flex flex-col gap-1 px-2 pb-2 md:pb-0">
          {enlaces.map(({ href, etiqueta, Icono }) => {
            const activo = href === "/panel" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-white/10 ${activo ? "bg-white/15 font-semibold" : ""}`}
              >
                <Icono aria-hidden className="size-4" />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
        <form action={cerrarSesion} className="px-2 pb-3 md:py-4">
          <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 hover:bg-white/10">
            <LogOut aria-hidden className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
