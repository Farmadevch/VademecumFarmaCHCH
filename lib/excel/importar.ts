import "server-only";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sinAcentos } from "@/lib/texto";
import { mensajeDb } from "@/lib/form";
import {
  COLUMNAS,
  claveDeEncabezado,
  claveMed,
  filaSchema,
  type ClaveColumna,
  type FilaImport,
} from "@/lib/excel/esquema";
import type { FilaPrevia, ResultadoImport } from "@/lib/excel/tipos";

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_FILAS = 2000;

export type FilaCruda = { fila: number; crudo: Partial<Record<ClaveColumna, unknown>> };

/** Pagina una consulta de Supabase (el API devuelve como máximo 1000 filas por vez). */
export async function todas<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw new Error("No se pudo leer la base de datos.");
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

// ---------- Lectura del archivo ----------

export function leerArchivo(buffer: Buffer, nombre: string): FilaCruda[] {
  const esCsv = nombre.toLowerCase().endsWith(".csv");
  let hoja: XLSX.WorkSheet | undefined;
  try {
    const libro = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      ...(esCsv ? { codepage: 65001 } : {}),
    });
    hoja = libro.Sheets[libro.SheetNames[0]];
  } catch {
    throw new Error("No se pudo leer el archivo. Verificá que sea un Excel (.xlsx) o CSV válido.");
  }
  if (!hoja) throw new Error("El archivo no tiene hojas.");

  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: null, blankrows: true });
  if (matriz.length === 0) throw new Error("El archivo está vacío.");

  const columnas = new Map<number, ClaveColumna>();
  matriz[0].forEach((celda, i) => {
    const clave = typeof celda === "string" ? claveDeEncabezado(celda) : undefined;
    if (clave && ![...columnas.values()].includes(clave)) columnas.set(i, clave);
  });

  const faltantes = COLUMNAS.filter((c) => "obligatoria" in c && !new Set(columnas.values()).has(c.key)).map((c) => c.titulo);
  if (faltantes.length)
    throw new Error(`Faltan columnas obligatorias en la primera fila: ${faltantes.join(", ")}. Descargá la plantilla para ver el formato.`);

  const filas: FilaCruda[] = [];
  matriz.slice(1).forEach((celdas, i) => {
    const crudo: FilaCruda["crudo"] = {};
    for (const [col, clave] of columnas) crudo[clave] = celdas[col] ?? null;
    const vacia = Object.values(crudo).every((v) => v == null || (typeof v === "string" && v.trim() === ""));
    if (!vacia) filas.push({ fila: i + 2, crudo }); // i + 2 = número de fila en Excel
  });

  if (filas.length === 0) throw new Error("No hay filas de datos debajo de los encabezados.");
  if (filas.length > MAX_FILAS) throw new Error(`El archivo tiene ${filas.length} filas; el máximo es ${MAX_FILAS}. Dividilo en partes.`);
  return filas;
}

// ---------- Análisis (validación + qué pasaría con cada fila) ----------

type Existentes = { porClave: Map<string, number>; porCodigo: Map<string, number> };

async function cargarExistentes(supabase: SupabaseClient): Promise<Existentes> {
  const meds = await todas<{ id: number; nombre_generico: string; concentracion: string; forma: string; codigo_barras: string | null }>(
    (d, h) => supabase.from("medicamentos").select("id, nombre_generico, concentracion, forma, codigo_barras").order("id").range(d, h),
  );
  const porClave = new Map<string, number>();
  const porCodigo = new Map<string, number>();
  for (const m of meds) {
    porClave.set(claveMed(m), m.id);
    if (m.codigo_barras) porCodigo.set(m.codigo_barras, m.id);
  }
  return { porClave, porCodigo };
}

export type FilaAnalizada = Omit<FilaPrevia, "datos"> & { datos?: FilaImport; clave?: string };

export async function analizar(supabase: SupabaseClient, filas: FilaCruda[]): Promise<FilaAnalizada[]> {
  const { porClave, porCodigo } = await cargarExistentes(supabase);
  const clavesVistas = new Map<string, number>(); // clave -> primera fila del archivo
  const codigosVistos = new Map<string, string>(); // código -> clave

  return filas.map(({ fila, crudo }) => {
    const parsed = filaSchema.safeParse(crudo);
    if (!parsed.success) {
      const errores = [...new Set(parsed.error.issues.map((i) => i.message))];
      return { fila, estado: "error", errores, resumen: resumenCrudo(crudo) };
    }
    const d = parsed.data;
    const clave = claveMed(d);
    const resumen = { generico: d.nombre_generico, concentracion: d.concentracion, forma: d.forma, laboratorio: d.laboratorio ?? "", lote: d.lote_nro ?? "" };
    const error = (msg: string): FilaAnalizada => ({ fila, estado: "error", errores: [msg], resumen });

    if (d.codigo_barras) {
      const otraClave = codigosVistos.get(d.codigo_barras);
      if (otraClave && otraClave !== clave) return error("El código de barras ya se usa en otra fila para un medicamento distinto.");
      const idCodigo = porCodigo.get(d.codigo_barras);
      const idClave = porClave.get(clave);
      if (idCodigo && idClave !== idCodigo) return error("Ese código de barras ya pertenece a otro medicamento cargado.");
      codigosVistos.set(d.codigo_barras, clave);
    }

    const primera = clavesVistas.get(clave);
    if (primera !== undefined) {
      if (!d.lote_nro) return error(`Medicamento repetido (ya está en la fila ${primera}). Si es otro lote, completá los datos del lote.`);
      return { fila, estado: "lote", errores: [], resumen, datos: d, clave };
    }
    clavesVistas.set(clave, fila);
    return { fila, estado: porClave.has(clave) ? "actualiza" : "nuevo", errores: [], resumen, datos: d, clave };
  });
}

function resumenCrudo(c: FilaCruda["crudo"]) {
  const t = (v: unknown) => (v == null || v instanceof Date ? "" : String(v));
  return { generico: t(c.nombre_generico), concentracion: t(c.concentracion), forma: t(c.forma), laboratorio: t(c.laboratorio), lote: t(c.lote_nro) };
}

// ---------- Aplicar ----------

export async function aplicar(supabase: SupabaseClient, filas: FilaAnalizada[]): Promise<ResultadoImport> {
  const r: ResultadoImport = { creados: 0, actualizados: 0, lotesCreados: 0, lotesOmitidos: 0, errores: [] };
  const validas = filas.filter((f): f is FilaAnalizada & { datos: FilaImport; clave: string } => !!f.datos && !!f.clave && f.estado !== "error");
  const fallar = (fila: number, mensaje: string) => r.errores.push({ fila, mensaje });

  // 1) Laboratorios: se crean los que no existan.
  const labs = await todas<{ id: number; nombre: string }>((d, h) => supabase.from("laboratorios").select("id, nombre").order("id").range(d, h));
  const labId = new Map(labs.map((l) => [sinAcentos(l.nombre).trim(), l.id]));
  const nuevos = new Map<string, string>();
  for (const f of validas) {
    const n = f.datos.laboratorio;
    if (n && !labId.has(sinAcentos(n).trim())) nuevos.set(sinAcentos(n).trim(), n);
  }
  if (nuevos.size) {
    const { data, error } = await supabase.from("laboratorios").insert([...nuevos.values()].map((nombre) => ({ nombre }))).select("id, nombre");
    if (error) throw new Error("No se pudieron crear los laboratorios: " + mensajeDb(error));
    for (const l of data ?? []) labId.set(sinAcentos(l.nombre).trim(), l.id);
  }
  const idLab = (n?: string) => (n ? labId.get(sinAcentos(n).trim()) : undefined);

  // 2) Medicamentos: la primera fila de cada clave define sus datos.
  const { porClave } = await cargarExistentes(supabase);
  const idPorClave = new Map(porClave);
  const principales = validas.filter((f) => f.estado === "nuevo" || f.estado === "actualiza");

  for (const f of principales.filter((p) => p.estado === "actualiza")) {
    const d = f.datos;
    const cambios: Record<string, unknown> = { via: d.via };
    if (d.nombre_comercial !== undefined) cambios.nombre_comercial = d.nombre_comercial;
    if (d.laboratorio !== undefined) cambios.laboratorio_id = idLab(d.laboratorio) ?? null;
    if (d.categoria !== undefined) cambios.categoria = d.categoria;
    if (d.codigo_barras !== undefined) cambios.codigo_barras = d.codigo_barras;
    if (d.stock_minimo !== undefined) cambios.stock_minimo = d.stock_minimo;
    if (d.controlado !== undefined) {
      cambios.controlado = d.controlado;
      cambios.lista_controlado = d.controlado ? (d.lista_controlado ?? null) : null;
    }
    const { error } = await supabase.from("medicamentos").update(cambios).eq("id", idPorClave.get(f.clave)!);
    if (error) fallar(f.fila, mensajeDb(error));
    else r.actualizados++;
  }

  const aInsertar = principales.filter((p) => p.estado === "nuevo");
  const fila = (f: (typeof aInsertar)[number]) => ({
    nombre_generico: f.datos.nombre_generico,
    nombre_comercial: f.datos.nombre_comercial ?? null,
    laboratorio_id: idLab(f.datos.laboratorio) ?? null,
    concentracion: f.datos.concentracion,
    forma: f.datos.forma,
    via: f.datos.via,
    categoria: f.datos.categoria ?? null,
    codigo_barras: f.datos.codigo_barras ?? null,
    stock_minimo: f.datos.stock_minimo ?? 0,
    controlado: f.datos.controlado ?? false,
    lista_controlado: f.datos.controlado ? (f.datos.lista_controlado ?? null) : null,
  });
  const fallidas = new Set<string>(); // claves que no se pudieron crear

  for (let i = 0; i < aInsertar.length; i += 100) {
    const lote = aInsertar.slice(i, i + 100);
    const { data, error } = await supabase.from("medicamentos").insert(lote.map(fila)).select("id, nombre_generico, concentracion, forma");
    if (!error) {
      for (const m of data ?? []) idPorClave.set(claveMed(m), m.id);
      r.creados += lote.length;
      continue;
    }
    // Si falla el bloque, se reintenta fila por fila para saber cuál tiene el problema.
    for (const f of lote) {
      const { data: uno, error: e } = await supabase.from("medicamentos").insert(fila(f)).select("id").single();
      if (e) {
        fallar(f.fila, mensajeDb(e));
        fallidas.add(f.clave);
      } else {
        idPorClave.set(f.clave, uno.id);
        r.creados++;
      }
    }
  }

  // 3) Lotes: se crean los nuevos; los que ya existen no se tocan (el stock cambia solo por movimientos).
  const conLote = validas.filter((f) => f.datos.lote_nro && !fallidas.has(f.clave) && idPorClave.has(f.clave));
  const ids = [...new Set(conLote.map((f) => idPorClave.get(f.clave)!))];
  const existentes = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const parte = ids.slice(i, i + 200);
    const lotes = await todas<{ medicamento_id: number; nro_lote: string }>((d, h) =>
      supabase.from("lotes").select("medicamento_id, nro_lote").in("medicamento_id", parte).order("id").range(d, h),
    );
    for (const l of lotes) existentes.add(`${l.medicamento_id}|${l.nro_lote}`);
  }

  for (const f of conLote) {
    const medId = idPorClave.get(f.clave)!;
    const k = `${medId}|${f.datos.lote_nro}`;
    if (existentes.has(k)) {
      r.lotesOmitidos++;
      continue;
    }
    const { error } = await supabase.rpc("crear_lote", {
      p_medicamento_id: medId,
      p_nro_lote: f.datos.lote_nro,
      p_vencimiento: f.datos.lote_vencimiento,
      p_cantidad: f.datos.lote_cantidad ?? 0,
      p_motivo: "Importación desde Excel",
    });
    if (error) fallar(f.fila, `Lote: ${mensajeDb(error)}`);
    else {
      existentes.add(k);
      r.lotesCreados++;
    }
  }

  // Filas que ya venían con error del análisis.
  for (const f of filas.filter((x) => x.estado === "error")) fallar(f.fila, f.errores.join(" "));
  r.errores.sort((a, b) => a.fila - b.fila);
  return r;
}
