import { z } from "zod";
import { sinAcentos } from "@/lib/texto";
import { FORMAS, FORMA_LABEL, type Forma } from "@/types/publico";

/** Columnas del Excel de medicamentos. `alias` = otros encabezados aceptados (ya normalizados). */
export const COLUMNAS = [
  { key: "nombre_generico", titulo: "Nombre genérico", obligatoria: true, alias: ["generico", "principio_activo", "droga"] },
  { key: "nombre_comercial", titulo: "Nombre comercial", alias: ["comercial", "marca"] },
  { key: "laboratorio", titulo: "Laboratorio", alias: [] },
  { key: "concentracion", titulo: "Concentración", obligatoria: true, alias: ["dosis"] },
  { key: "forma", titulo: "Forma", obligatoria: true, alias: ["forma_farmaceutica", "presentacion"] },
  { key: "via", titulo: "Vía", obligatoria: true, alias: ["via_de_administracion", "via_administracion"] },
  { key: "categoria", titulo: "Categoría", alias: ["categoria_terapeutica"] },
  { key: "codigo_barras", titulo: "Código de barras", alias: ["codigo", "ean", "gtin"] },
  { key: "stock_minimo", titulo: "Stock mínimo", alias: ["minimo"] },
  { key: "controlado", titulo: "Controlado", alias: [] },
  { key: "lista_controlado", titulo: "Lista", alias: ["lista_de_control"] },
  { key: "lote_nro", titulo: "N° de lote", alias: ["nro_lote", "numero_de_lote", "lote"] },
  { key: "lote_vencimiento", titulo: "Vencimiento del lote", alias: ["vencimiento", "fecha_de_vencimiento"] },
  { key: "lote_cantidad", titulo: "Cantidad del lote", alias: ["cantidad", "cantidad_inicial"] },
] as const;

export type ClaveColumna = (typeof COLUMNAS)[number]["key"];

export function normalizarEncabezado(s: string) {
  return sinAcentos(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const ENCABEZADOS = new Map<string, ClaveColumna>();
for (const c of COLUMNAS) {
  ENCABEZADOS.set(c.key, c.key);
  ENCABEZADOS.set(normalizarEncabezado(c.titulo), c.key);
  for (const a of c.alias) ENCABEZADOS.set(a, c.key);
}
export const claveDeEncabezado = (texto: string) => ENCABEZADOS.get(normalizarEncabezado(texto));

// ---------- Conversión de celdas (todas idempotentes: aceptan su propia salida) ----------

const aTexto = (v: unknown) => {
  if (v == null || v instanceof Date) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const aNumero = (v: unknown) => {
  if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
  if (typeof v === "number") return v;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isNaN(n) ? v : n;
};

const aBooleano = (v: unknown) => {
  if (typeof v === "boolean") return v;
  const s = aTexto(v);
  if (s === undefined) return undefined;
  const t = sinAcentos(s);
  if (["si", "s", "x", "1", "true", "verdadero", "controlado"].includes(t)) return true;
  if (["no", "n", "0", "false", "falso"].includes(t)) return false;
  return s; // inválido: lo rechaza z.boolean()
};

const iso = (y: number, m: number, d: number) => {
  const f = new Date(Date.UTC(y, m - 1, d));
  const ok = f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
  return ok ? `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : undefined;
};

const aFecha = (v: unknown) => {
  if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
  if (v instanceof Date) {
    // SheetJS arma la fecha a medianoche local con un pequeño desfase: sumar 12 h evita caer en el día anterior.
    const d = new Date(v.getTime() + 12 * 3_600_000);
    return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()) ?? String(v);
  }
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000); // serie de Excel
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) ?? String(v);
  }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]) ?? s;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s); // dd/mm/aaaa
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]) ?? s;
  return s;
};

const FORMAS_POR_TEXTO = new Map<string, Forma>();
for (const f of FORMAS) {
  FORMAS_POR_TEXTO.set(normalizarEncabezado(f), f);
  FORMAS_POR_TEXTO.set(normalizarEncabezado(FORMA_LABEL[f]), f);
}
const aForma = (v: unknown) => {
  const s = aTexto(v);
  if (s === undefined) return undefined;
  const k = normalizarEncabezado(s);
  return FORMAS_POR_TEXTO.get(k) ?? FORMAS_POR_TEXTO.get(k.replace(/s$/, "")) ?? s;
};

const requerido = (max: number, msg: string) =>
  z.preprocess(aTexto, z.string({ error: msg }).min(1, msg).max(max, `Máximo ${max} caracteres.`));
const opcional = (max: number) => z.preprocess(aTexto, z.string().max(max, `Máximo ${max} caracteres.`).optional());
const entero = (msg: string) =>
  z.preprocess(aNumero, z.number({ error: msg }).int(msg).min(0, msg).max(10_000_000, msg).optional());

export const filaSchema = z
  .object({
    nombre_generico: requerido(120, "Falta el nombre genérico."),
    nombre_comercial: opcional(120),
    laboratorio: opcional(80),
    concentracion: requerido(60, "Falta la concentración."),
    forma: z.preprocess(
      aForma,
      z.enum(FORMAS, { error: "Forma no reconocida (ej.: comprimido, cápsula, ampolla)." }),
    ),
    via: requerido(40, "Falta la vía."),
    categoria: opcional(80),
    codigo_barras: opcional(60),
    stock_minimo: entero("Stock mínimo inválido (entero ≥ 0)."),
    controlado: z.preprocess(aBooleano, z.boolean({ error: "Controlado debe ser Sí o No." }).optional()),
    lista_controlado: opcional(10),
    lote_nro: opcional(60),
    lote_vencimiento: z.preprocess(
      aFecha,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de lote inválida (usá dd/mm/aaaa).").optional(),
    ),
    lote_cantidad: entero("Cantidad del lote inválida (entero ≥ 0)."),
  })
  .superRefine((d, ctx) => {
    if (d.controlado === true && !d.lista_controlado)
      ctx.addIssue({ code: "custom", path: ["lista_controlado"], message: "Indicá la lista del controlado." });
    if (d.controlado === false && d.lista_controlado)
      ctx.addIssue({ code: "custom", path: ["lista_controlado"], message: "Tiene lista pero no está marcado como controlado." });
    if (d.lote_nro && !d.lote_vencimiento)
      ctx.addIssue({ code: "custom", path: ["lote_vencimiento"], message: "Falta el vencimiento del lote." });
    if (!d.lote_nro && (d.lote_vencimiento || d.lote_cantidad))
      ctx.addIssue({ code: "custom", path: ["lote_nro"], message: "Falta el número de lote." });
  })
  // Una lista sin la columna "Controlado" implica controlado.
  .transform((d) => ({ ...d, controlado: d.controlado ?? (d.lista_controlado ? true : undefined) }));

export type FilaImport = z.output<typeof filaSchema>;

/** Clave de identidad de un medicamento: genérico + concentración + forma (sin acentos ni mayúsculas). */
export function claveMed(f: { nombre_generico: string; concentracion: string; forma: string }) {
  return [f.nombre_generico, f.concentracion, f.forma]
    .map((x) => sinAcentos(x).replace(/\s+/g, " ").trim())
    .join("|");
}
