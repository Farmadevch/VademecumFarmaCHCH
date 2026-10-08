import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ping para evitar la pausa de Supabase Free (cron de Vercel) y para monitoreo. */
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("opciones_filtros");
  if (error) return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true });
}
