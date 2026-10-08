import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Estado } from "@/types/publico";

export function estadoDe(stock: number, minimo: number): Estado {
  if (stock === 0) return "sin_stock";
  if (stock <= minimo) return "bajo";
  return "disponible";
}

export { sinAcentos } from "@/lib/texto";
import { sinAcentos } from "@/lib/texto";

export type FilaInventario = {
  id: number;
  nombre_generico: string;
  nombre_comercial: string | null;
  concentracion: string;
  forma: string;
  laboratorio: string | null;
  stock_minimo: number;
  controlado: boolean;
  lista_controlado: string | null;
  activo: boolean;
  stock_total: number;
  proximo_vencimiento: string | null;
  estado: Estado;
};

export async function inventario(opts: { q?: string; incluirArchivados?: boolean } = {}): Promise<FilaInventario[]> {
  const supabase = await createClient();
  let consulta = supabase
    .from("medicamentos")
    .select(
      "id, nombre_generico, nombre_comercial, concentracion, forma, stock_minimo, controlado, lista_controlado, activo, laboratorios(nombre)",
    )
    .order("nombre_generico")
    .order("concentracion");
  if (!opts.incluirArchivados) consulta = consulta.eq("activo", true);
  if (opts.q) consulta = consulta.ilike("busqueda", `%${sinAcentos(opts.q).replace(/[%_,()]/g, " ")}%`);

  const [meds, stocks] = await Promise.all([
    consulta,
    supabase.from("v_stock").select("medicamento_id, stock_total, proximo_vencimiento"),
  ]);

  const porId = new Map((stocks.data ?? []).map((s) => [s.medicamento_id, s]));
  return (meds.data ?? []).map((m) => {
    const s = porId.get(m.id);
    const stock_total = s?.stock_total ?? 0;
    return {
      id: m.id,
      nombre_generico: m.nombre_generico,
      nombre_comercial: m.nombre_comercial,
      concentracion: m.concentracion,
      forma: m.forma,
      laboratorio: (m.laboratorios as unknown as { nombre: string } | null)?.nombre ?? null,
      stock_minimo: m.stock_minimo,
      controlado: m.controlado,
      lista_controlado: m.lista_controlado,
      activo: m.activo,
      stock_total,
      proximo_vencimiento: s?.proximo_vencimiento ?? null,
      estado: estadoDe(stock_total, m.stock_minimo),
    };
  });
}

export function diasHasta(fecha: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [y, mo, d] = fecha.split("-").map(Number);
  return Math.round((new Date(y, mo - 1, d).getTime() - hoy.getTime()) / 86_400_000);
}

export function fechaAR(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha ISO (yyyy-mm-dd) de hoy más N días, en hora local. */
export function fechaIso(masDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + masDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
