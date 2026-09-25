import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";
import { EstiloFoliado } from "@/components/EstiloFoliado";
import { LegajoCompleto } from "@/components/LegajoCompleto";

type Params = { id: string };

export default async function LegajosFoliadosPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sucursal }, { data: residentes }] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").eq("id", id).single<{ id: string; nombre: string }>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<{ id: string; nombre: string; apellido: string }[]>(),
  ]);

  if (!sucursal) notFound();
  const lista = residentes ?? [];

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:p-0">
      <EstiloFoliado pie={`Legajos de residentes · ${sucursal.nombre}`} />
      <div className="w-full max-w-[860px] rounded-2xl border border-edge bg-white p-10 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href={`/sucursales/${id}/legales/libro-foliado`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver a Legales
          </Link>
          <BotonImprimir />
        </div>

        <section className="text-black">
          <h1 className="text-xl font-bold">Legajos de residentes — {sucursal.nombre}</h1>
          <p className="text-xs text-neutral-600">
            Emitido el {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · {lista.length} residentes activos · hojas foliadas
            en forma correlativa
          </p>
          <ol className="mt-4 list-decimal pl-5 text-sm">
            {lista.map((r) => (
              <li key={r.id}>
                {r.apellido}, {r.nombre}
              </li>
            ))}
          </ol>
        </section>

        {lista.map((r) => (
          <div key={r.id} className="salto-folio mt-10 border-t border-edge pt-6 print:mt-0 print:border-0 print:pt-0">
            <LegajoCompleto residenteId={r.id} sede={sucursal.nombre} />
          </div>
        ))}
      </div>
    </div>
  );
}
