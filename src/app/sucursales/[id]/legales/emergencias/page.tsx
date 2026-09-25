import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import { EmergenciasSeccion } from "@/components/EmergenciasSeccion";
import { mesAnioArgentina } from "@/lib/fechas";

type Params = { id: string };

export default async function InformeEmergenciasPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ anio?: string }>;
}) {
  const { id } = await params;
  const { anio: anioParam } = await searchParams;
  const anio = anioParam && /^\d{4}$/.test(anioParam) ? Number(anioParam) : mesAnioArgentina().anio;

  const supabase = await createClient();
  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal) notFound();

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>
      <div className="w-full max-w-[1200px] rounded-2xl border border-edge bg-card p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href={`/sucursales/${id}/legales/certificaciones?anio=${anio}`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver a Certificaciones y proveedores
          </Link>
          <BotonExportarPdf />
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brass print:text-neutral-600">
          Los Abuelos · {sucursal.nombre}
        </p>
        <EmergenciasSeccion sucursalId={id} anio={anio} imprimible />
      </div>
    </div>
  );
}
