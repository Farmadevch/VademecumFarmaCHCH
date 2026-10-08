import { z } from "zod";
import { FORMAS } from "@/types/publico";

const texto = (max = 120) => z.string().trim().max(max);
const opcional = (max = 120) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), texto(max).optional());
const entero = (min = 0) => z.coerce.number({ error: "Ingresá un número." }).int("Debe ser un entero.").min(min, `Mínimo ${min}.`);

export const medicamentoSchema = z
  .object({
    id: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
    nombre_generico: texto().min(1, "Ingresá el nombre genérico."),
    nombre_comercial: opcional(),
    laboratorio_id: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().positive().optional()),
    concentracion: texto(60).min(1, "Ingresá la concentración."),
    forma: z.enum(FORMAS, { error: "Elegí la forma." }),
    via: texto(40).min(1, "Ingresá la vía."),
    categoria: opcional(80),
    codigo_barras: opcional(60),
    stock_minimo: entero(0),
    controlado: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    lista_controlado: opcional(10),
    // Solo en el alta: primer lote.
    lote_nro: opcional(60),
    lote_vencimiento: opcional(10),
    lote_cantidad: z.preprocess((v) => (v === "" || v == null ? undefined : v), entero(0).optional()),
  })
  .superRefine((d, ctx) => {
    if (d.controlado && !d.lista_controlado)
      ctx.addIssue({ code: "custom", path: ["lista_controlado"], message: "Indicá la lista del controlado." });
    if (d.lote_nro && !d.lote_vencimiento)
      ctx.addIssue({ code: "custom", path: ["lote_vencimiento"], message: "Ingresá el vencimiento del lote." });
  });

export const laboratorioSchema = z.object({
  id: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  nombre: texto(80).min(1, "Ingresá el nombre."),
});

export const movimientoSchema = z
  .object({
    lote_id: z.coerce.number({ error: "Elegí un lote." }).int().positive("Elegí un lote."),
    tipo: z.enum(["ingreso", "egreso", "ajuste", "vencido"], { error: "Elegí el tipo." }),
    cantidad: entero(1),
    sentido: z.preprocess((v) => (v === "-1" ? -1 : 1), z.union([z.literal(1), z.literal(-1)])),
    motivo: opcional(200),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "ajuste" && !d.motivo)
      ctx.addIssue({ code: "custom", path: ["motivo"], message: "Un ajuste necesita motivo." });
  });

export const loteSchema = z.object({
  medicamento_id: z.coerce.number({ error: "Elegí el medicamento." }).int().positive("Elegí el medicamento."),
  nro_lote: texto(60).min(1, "Ingresá el número de lote."),
  vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá el vencimiento."),
  cantidad: entero(0),
});

export const usuarioSchema = z.object({
  email: z.string().trim().email("Ingresá un correo válido."),
  nombre: texto(80).min(1, "Ingresá el nombre."),
  rol: z.enum(["farmacia", "admin"], { error: "Elegí el rol." }),
  password: z.string().min(10, "La contraseña temporal debe tener al menos 10 caracteres."),
});
