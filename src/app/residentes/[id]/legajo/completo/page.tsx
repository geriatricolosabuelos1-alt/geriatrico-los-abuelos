import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";
import { EstiloFoliado } from "@/components/EstiloFoliado";
import { LegajoCompleto } from "@/components/LegajoCompleto";

type Params = { id: string };

export default async function LegajoCompletoPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: residente } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, sucursales(nombre)")
    .eq("id", id)
    .single<{ id: string; nombre: string; apellido: string; sucursales: { nombre: string } | null }>();

  if (!residente) notFound();
  const sede = residente.sucursales?.nombre ?? "";

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:p-0">
      <EstiloFoliado pie={`Legajo ${residente.apellido}, ${residente.nombre} · ${sede}`} />
      <div className="w-full max-w-[860px] rounded-2xl border border-edge bg-white p-10 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href={`/residentes/${id}/legajo`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver al legajo
          </Link>
          <BotonImprimir />
        </div>
        <LegajoCompleto residenteId={id} sede={sede} />
      </div>
    </div>
  );
}
