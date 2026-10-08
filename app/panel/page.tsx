import Link from "next/link";
import { AlertTriangle, CalendarClock, PackageX, Pill } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fechaIso, inventario } from "@/lib/panel-data";

export const metadata = { title: "Panel · Vademécum Farmacia" };

export default async function PanelInicio() {
  const supabase = await createClient();

  const [items, venciendo] = await Promise.all([
    inventario(),
    supabase
      .from("lotes")
      .select("id", { count: "exact", head: true })
      .gt("cantidad", 0)
      .gte("vencimiento", fechaIso(0))
      .lte("vencimiento", fechaIso(30)),
  ]);

  const tarjetas = [
    { etiqueta: "Ítems activos", valor: items.length, Icono: Pill, href: "/panel/medicamentos" },
    { etiqueta: "Stock bajo", valor: items.filter((i) => i.estado === "bajo").length, Icono: AlertTriangle, href: "/panel/medicamentos?estado=bajo" },
    { etiqueta: "Sin stock", valor: items.filter((i) => i.estado === "sin_stock").length, Icono: PackageX, href: "/panel/medicamentos?estado=sin_stock" },
    { etiqueta: "Lotes que vencen en ≤ 30 días", valor: venciendo.count ?? 0, Icono: CalendarClock, href: "/panel/lotes?dias=30" },
  ];

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Inicio</h1>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ etiqueta, valor, Icono, href }) => (
          <li key={etiqueta}>
            <Link href={href} className="flex min-h-24 items-center gap-4 rounded-xl border border-line bg-white p-4 hover:border-primary">
              <Icono aria-hidden className="size-8 text-primary" />
              <div>
                <p className="font-mono text-3xl">{valor}</p>
                <p className="text-sm text-muted">{etiqueta}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
