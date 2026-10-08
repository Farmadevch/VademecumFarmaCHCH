import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Pill } from "lucide-react";
import { obtenerSesion } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingreso de Farmacia · Vademécum" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await obtenerSesion()) redirect("/panel");
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-primary text-white">
            <Pill aria-hidden className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Ingreso de Farmacia</h1>
            <p className="text-sm text-muted">Hospital de Choele Choel</p>
          </div>
        </div>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft aria-hidden className="size-4" />
        Volver al buscador
      </Link>
    </main>
  );
}
