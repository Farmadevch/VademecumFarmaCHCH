import Link from "next/link";
import { ArrowLeftRight, Pencil, Plus, Archive, ArchiveRestore, FileDown, FileUp } from "lucide-react";
import { EstadoBadge } from "@/components/EstadoBadge";
import { fechaAR, inventario } from "@/lib/panel-data";
import { FORMA_LABEL, type Forma } from "@/types/publico";
import { cambiarEstadoMedicamento } from "./actions";

export const metadata = { title: "Medicamentos · Panel" };

export default async function MedicamentosPage({ searchParams }: PageProps<"/panel/medicamentos">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const archivados = sp.archivados === "1";
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const error = typeof sp.error === "string" ? sp.error : "";

  const todos = await inventario({ q, incluirArchivados: archivados });
  const items = estado ? todos.filter((i) => i.estado === estado) : todos;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Medicamentos</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/exportar/medicamentos" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-input-border bg-white px-4 font-medium hover:bg-chip">
            <FileDown aria-hidden className="size-4" />
            Exportar Excel
          </a>
          <Link href="/panel/importar" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-input-border bg-white px-4 font-medium hover:bg-chip">
            <FileUp aria-hidden className="size-4" />
            Importar
          </Link>
          <Link href="/panel/medicamentos/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark">
          <Plus aria-hidden className="size-4" />
          Nuevo medicamento
        </Link>
        </div>
      </div>

      {ok && <p role="status" className="mb-4 rounded-lg bg-ok-bg p-3 text-sm text-ok-text">{ok}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-out-bg p-3 text-sm text-out-text">{error}</p>}

      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-sm font-medium text-muted">Buscar</label>
          <input id="q" name="q" defaultValue={q} className="min-h-11 w-64 max-w-full rounded-lg border border-input-border bg-white px-3" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="estado" className="text-sm font-medium text-muted">Estado</label>
          <select id="estado" name="estado" defaultValue={estado} className="min-h-11 rounded-lg border border-input-border bg-white px-3">
            <option value="">Todos</option>
            <option value="disponible">Disponible</option>
            <option value="bajo">Stock bajo</option>
            <option value="sin_stock">Sin stock</option>
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="archivados" value="1" defaultChecked={archivados} className="size-5" />
          Ver archivados
        </label>
        <button className="min-h-11 rounded-lg border border-input-border bg-white px-4 font-medium">Filtrar</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm md:min-w-[56rem]">
          <thead className="border-b border-line bg-chip text-muted max-md:hidden">
            <tr>
              <th className="p-3 font-semibold">Medicamento</th>
              <th className="p-3 font-semibold">Presentación</th>
              <th className="p-3 font-semibold">Laboratorio</th>
              <th className="p-3 text-right font-semibold">Stock</th>
              <th className="p-3 text-right font-semibold">Mínimo</th>
              <th className="p-3 font-semibold">Próx. venc.</th>
              <th className="p-3 font-semibold">Estado</th>
              <th className="p-3 font-semibold"><span className="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr className="max-md:block"><td colSpan={8} className="p-6 max-md:block text-center text-muted">No hay medicamentos para mostrar.</td></tr>
            )}
            {items.map((m) => (
              <tr key={m.id} className={`border-b border-line last:border-0 max-md:block max-md:p-3 ${m.activo ? "" : "opacity-60"}`}>
                <td className="p-3 max-md:block max-md:px-0 max-md:pt-0">
                  <p className="font-semibold">{m.nombre_generico}</p>
                  <p className="text-muted">
                    {m.nombre_comercial}
                    {m.controlado && <span className="ml-2 rounded-full bg-ctrl-bg px-2 py-0.5 text-xs font-semibold text-ctrl-text">Controlado · Lista {m.lista_controlado}</span>}
                    {!m.activo && <span className="ml-2 text-xs font-semibold">(archivado)</span>}
                  </p>
                </td>
                <td data-label="Presentación" className="p-3 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]"><span><span className="font-mono">{m.concentracion}</span> · {FORMA_LABEL[m.forma as Forma] ?? m.forma}</span></td>
                <td data-label="Laboratorio" className="p-3 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{m.laboratorio ?? "—"}</td>
                <td data-label="Stock" className="p-3 text-right font-mono max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{m.stock_total}</td>
                <td data-label="Mínimo" className="p-3 text-right font-mono max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{m.stock_minimo}</td>
                <td data-label="Próx. venc." className="p-3 font-mono max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]">{m.proximo_vencimiento ? fechaAR(m.proximo_vencimiento) : "—"}</td>
                <td data-label="Estado" className="p-3 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:px-0 max-md:py-1.5 max-md:before:font-semibold max-md:before:text-muted max-md:before:content-[attr(data-label)]"><EstadoBadge estado={m.estado} /></td>
                <td className="p-3 max-md:block max-md:px-0 max-md:pb-0">
                  <div className="flex gap-1">
                    <Link href={`/panel/medicamentos/${m.id}`} aria-label={`Editar ${m.nombre_generico}`} title="Editar" className="grid size-11 place-items-center rounded-lg hover:bg-chip"><Pencil aria-hidden className="size-4" /></Link>
                    <Link href={`/panel/movimientos?medicamento=${m.id}`} aria-label={`Registrar movimiento de ${m.nombre_generico}`} title="Movimiento" className="grid size-11 place-items-center rounded-lg hover:bg-chip"><ArrowLeftRight aria-hidden className="size-4" /></Link>
                    <form action={cambiarEstadoMedicamento}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="activo" value={String(!m.activo)} />
                      <button
                        aria-label={`${m.activo ? "Archivar" : "Reactivar"} ${m.nombre_generico}`}
                        title={m.activo ? "Archivar" : "Reactivar"}
                        className="grid size-11 place-items-center rounded-lg hover:bg-chip"
                      >
                        {m.activo ? <Archive aria-hidden className="size-4" /> : <ArchiveRestore aria-hidden className="size-4" />}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
