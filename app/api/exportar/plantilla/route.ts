import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { libroPlantilla, respuestaXlsx } from "@/lib/excel/exportar";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await obtenerSesion())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return respuestaXlsx(libroPlantilla(), "plantilla-medicamentos.xlsx");
}
