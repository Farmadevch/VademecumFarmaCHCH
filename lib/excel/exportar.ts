import "server-only";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COLUMNAS } from "@/lib/excel/esquema";
import { todas } from "@/lib/excel/importar";
import { FORMA_LABEL, type Forma } from "@/types/publico";

const titulo = (k: (typeof COLUMNAS)[number]["key"]) => COLUMNAS.find((c) => c.key === k)!.titulo;
const SI_NO = (b: boolean) => (b ? "Sí" : "No");

function hoja(filas: Record<string, unknown>[], anchos: number[]) {
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = anchos.map((wch) => ({ wch }));
  return ws;
}

function aBuffer(libro: XLSX.WorkBook): Buffer {
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Inventario completo. La hoja "Medicamentos" se puede volver a importar tal cual (las columnas extra se ignoran). */
export async function libroInventario(supabase: SupabaseClient): Promise<Buffer> {
  const [meds, stocks, lotes] = await Promise.all([
    todas<{
      id: number; nombre_generico: string; nombre_comercial: string | null; concentracion: string; forma: Forma;
      via: string; categoria: string | null; codigo_barras: string | null; stock_minimo: number;
      controlado: boolean; lista_controlado: string | null; activo: boolean;
      laboratorios: { nombre: string } | { nombre: string }[] | null;
    }>((d, h) =>
      supabase
        .from("medicamentos")
        .select("id, nombre_generico, nombre_comercial, concentracion, forma, via, categoria, codigo_barras, stock_minimo, controlado, lista_controlado, activo, laboratorios(nombre)")
        .order("nombre_generico").order("concentracion").order("id").range(d, h),
    ),
    todas<{ medicamento_id: number; stock_total: number; proximo_vencimiento: string | null }>((d, h) =>
      supabase.from("v_stock").select("medicamento_id, stock_total, proximo_vencimiento").order("medicamento_id").range(d, h),
    ),
    todas<{ medicamento_id: number; nro_lote: string; vencimiento: string; cantidad: number }>((d, h) =>
      supabase.from("lotes").select("medicamento_id, nro_lote, vencimiento, cantidad").order("vencimiento").order("id").range(d, h),
    ),
  ]);

  const stockDe = new Map(stocks.map((s) => [s.medicamento_id, s]));
  const medDe = new Map(meds.map((m) => [m.id, m]));

  const filasMed = meds.map((m) => {
    const lab = Array.isArray(m.laboratorios) ? m.laboratorios[0] : m.laboratorios;
    const s = stockDe.get(m.id);
    return {
      [titulo("nombre_generico")]: m.nombre_generico,
      [titulo("nombre_comercial")]: m.nombre_comercial ?? "",
      [titulo("laboratorio")]: lab?.nombre ?? "",
      [titulo("concentracion")]: m.concentracion,
      [titulo("forma")]: FORMA_LABEL[m.forma] ?? m.forma,
      [titulo("via")]: m.via,
      [titulo("categoria")]: m.categoria ?? "",
      [titulo("codigo_barras")]: m.codigo_barras ?? "",
      [titulo("stock_minimo")]: m.stock_minimo,
      [titulo("controlado")]: SI_NO(m.controlado),
      [titulo("lista_controlado")]: m.lista_controlado ?? "",
      // Informativas (el importador las ignora):
      "Stock actual": s?.stock_total ?? 0,
      "Próximo vencimiento": s?.proximo_vencimiento ?? "",
      "Activo": SI_NO(m.activo),
    };
  });

  const filasLotes = lotes.flatMap((l) => {
    const m = medDe.get(l.medicamento_id);
    if (!m) return [];
    return [{
      "Nombre genérico": m.nombre_generico,
      "Concentración": m.concentracion,
      "Forma": FORMA_LABEL[m.forma] ?? m.forma,
      "N° de lote": l.nro_lote,
      "Vencimiento": l.vencimiento,
      "Cantidad": l.cantidad,
    }];
  });

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja(filasMed, [28, 22, 18, 16, 16, 12, 22, 18, 13, 11, 8, 13, 20, 8]), "Medicamentos");
  XLSX.utils.book_append_sheet(libro, hoja(filasLotes, [28, 16, 16, 16, 14, 10]), "Lotes");
  return aBuffer(libro);
}

/** Plantilla vacía con dos filas de ejemplo y una hoja de instrucciones. */
export function libroPlantilla(): Buffer {
  const t = titulo;
  const ejemplo = [
    {
      [t("nombre_generico")]: "Amoxicilina", [t("nombre_comercial")]: "Amoxidal", [t("laboratorio")]: "Roemmers",
      [t("concentracion")]: "500 mg", [t("forma")]: "Cápsula", [t("via")]: "oral", [t("categoria")]: "Antibióticos",
      [t("codigo_barras")]: "", [t("stock_minimo")]: 50, [t("controlado")]: "No", [t("lista_controlado")]: "",
      [t("lote_nro")]: "A-2401", [t("lote_vencimiento")]: "31/12/2027", [t("lote_cantidad")]: 300,
    },
    {
      [t("nombre_generico")]: "Diazepam", [t("nombre_comercial")]: "", [t("laboratorio")]: "",
      [t("concentracion")]: "10 mg", [t("forma")]: "Comprimido", [t("via")]: "oral", [t("categoria")]: "Psicofármacos",
      [t("codigo_barras")]: "", [t("stock_minimo")]: 20, [t("controlado")]: "Sí", [t("lista_controlado")]: "IV",
      [t("lote_nro")]: "", [t("lote_vencimiento")]: "", [t("lote_cantidad")]: "",
    },
  ];

  const instrucciones = [
    ["Columna", "Obligatoria", "Qué poner"],
    ["Nombre genérico", "Sí", "Principio activo."],
    ["Nombre comercial", "No", "Marca."],
    ["Laboratorio", "No", "Si no existe, se crea."],
    ["Concentración", "Sí", "Ej.: 500 mg, 250 mg/5 ml."],
    ["Forma", "Sí", "Una de: " + Object.values(FORMA_LABEL).join(", ") + "."],
    ["Vía", "Sí", "oral, IM, EV, IM/EV, tópica…"],
    ["Categoría", "No", "Categoría terapéutica."],
    ["Código de barras", "No", "Único por medicamento."],
    ["Stock mínimo", "No", "Entero ≥ 0 (por defecto 0)."],
    ["Controlado", "No", "Sí / No."],
    ["Lista", "Si es controlado", "I, II, III, IV…"],
    ["N° de lote", "No", "Para cargar un lote. Si el medicamento tiene varios, repetí la fila con otro lote."],
    ["Vencimiento del lote", "Si hay lote", "dd/mm/aaaa."],
    ["Cantidad del lote", "No", "Se registra como un ingreso. Si el lote ya existe, no se modifica."],
    [],
    ["Identidad", "", "Un medicamento = nombre genérico + concentración + forma. Si ya existe se actualiza; si no, se crea."],
    ["Celdas vacías", "", "Al actualizar, una celda vacía no borra el dato que ya está cargado."],
  ];

  const ws = hoja(ejemplo, [28, 22, 18, 16, 16, 12, 22, 18, 13, 11, 8, 13, 20, 16]);
  const wi = XLSX.utils.aoa_to_sheet(instrucciones);
  wi["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 90 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, ws, "Medicamentos");
  XLSX.utils.book_append_sheet(libro, wi, "Instrucciones");
  return aBuffer(libro);
}

export function respuestaXlsx(buffer: Buffer, nombre: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
