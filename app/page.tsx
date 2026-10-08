import Link from "next/link";
import { Suspense } from "react";
import { Pill, LogIn } from "lucide-react";
import { BuscadorFiltros } from "@/components/BuscadorFiltros";
import { MedicamentoCard } from "@/components/MedicamentoCard";
import { busquedaSchema } from "@/lib/validations/busqueda";
import { createClient } from "@/lib/supabase/server";
import type { MedicamentoPublico, OpcionesFiltros } from "@/types/publico";

const SIN_OPCIONES: OpcionesFiltros = { laboratorios: [], categorias: [], concentraciones: [] };

export default async function Home({ searchParams }: PageProps<"/">) {
  const parsed = busquedaSchema.safeParse(
    Object.fromEntries(
      Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );
  const f = parsed.success ? parsed.data : {};

  const supabase = await createClient();
  const [lista, filtros] = await Promise.all([
    supabase.rpc("buscar_medicamentos", {
      q: f.q ?? null,
      p_laboratorio: f.lab ?? null,
      p_forma: f.forma ?? null,
      p_categoria: f.cat ?? null,
      p_concentracion: f.conc ?? null,
      p_estado: f.estado ?? null,
    }),
    supabase.rpc("opciones_filtros"),
  ]);

  const medicamentos = (lista.data ?? []) as MedicamentoPublico[];
  const opciones = (filtros.data ?? SIN_OPCIONES) as OpcionesFiltros;

  return (
    <>
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Pill aria-hidden className="size-7" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Vademécum · Farmacia</h1>
              <p className="text-sm text-white/80">Hospital de Choele Choel</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/40 px-4 font-medium hover:bg-primary-dark"
          >
            <LogIn aria-hidden className="size-4" />
            Farmacia
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense>
          <BuscadorFiltros opciones={opciones} />
        </Suspense>

        <section aria-live="polite" className="mt-6">
          {lista.error ? (
            <p className="rounded-lg bg-out-bg p-4 text-out-text">
              No pudimos cargar los medicamentos. Probá de nuevo en unos minutos.
            </p>
          ) : medicamentos.length === 0 ? (
            <p className="py-12 text-center text-muted">
              No encontramos medicamentos con esa búsqueda. Revisá el nombre o sacá algún filtro.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                {medicamentos.length} {medicamentos.length === 1 ? "resultado" : "resultados"}
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {medicamentos.map((m) => (
                  <MedicamentoCard key={m.id} m={m} />
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-sm text-muted">
        El estado de stock es orientativo. Ante dudas, consultá en Farmacia.
      </footer>
    </>
  );
}
