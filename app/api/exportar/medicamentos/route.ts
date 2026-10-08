import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { libroInventario, respuestaXlsx } from "@/lib/excel/exportar";
import { fechaIso } from "@/lib/panel-data";

export const dynamic = "force-dynamic";

export async function GET() {
  // El proxy no protege /api: el rol se chequea acá, en el servidor.
  if (!(await obtenerSesion())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const supabase = await createClient();
    return respuestaXlsx(await libroInventario(supabase), `medicamentos-${fechaIso()}.xlsx`);
  } catch {
    return NextResponse.json({ error: "No se pudo generar el archivo." }, { status: 500 });
  }
}
