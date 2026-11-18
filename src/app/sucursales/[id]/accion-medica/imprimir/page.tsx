import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";
import { PieImpresion } from "@/components/PieImpresion";
import { HojaEvaluacionMedica, type DatosHojaEvaluacion } from "@/components/HojaEvaluacionMedica";
import { listarEvaluacionesMedicas, listarIndicacionesMedicas } from "@/app/residentes/[id]/accion-medica/evaluacion-actions";

type Params = { id: string };

type Residente = {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  ficha_administrativa: { obra_social: string | null; numero_afiliado: string | null } | null;
};

// Todas las evaluaciones médicas firmadas de la sede, una hoja por residente, impresas de una vez
// (la última firmada de cada uno).
export default async function ImprimirEvaluacionesPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sucursal }, { data: residentes }] = await Promise.all([
    supabase.from("sucursales").select("nombre").eq("id", id).single<{ nombre: string }>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido, habitacion, dni, fecha_nacimiento, ficha_administrativa(obra_social, numero_afiliado)")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<Residente[]>(),
  ]);
  if (!sucursal) notFound();

  const hojas: DatosHojaEvaluacion[] = (
    await Promise.all(
      (residentes ?? []).map(async (r) => {
        const [evaluaciones, indicaciones] = await Promise.all([
          listarEvaluacionesMedicas(r.id),
          listarIndicacionesMedicas(r.id),
        ]);
        const evaluacion = evaluaciones.find((e) => e.firmado_por) ?? null;
        const indicacion = indicaciones.find((i) => i.firmado_por) ?? null;
        if (!evaluacion && !indicacion) return null;
        return {
          nombre: `${r.apellido}, ${r.nombre}`,
          dni: r.dni,
          fechaNacimiento: r.fecha_nacimiento,
          obraSocial: r.ficha_administrativa?.obra_social ?? null,
          afiliado: r.ficha_administrativa?.numero_afiliado ?? null,
          habitacion: r.habitacion,
          evaluacion,
          indicacion,
        };
      }),
    )
  ).filter((h): h is DatosHojaEvaluacion => h !== null);

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 14mm; } .hoja-evaluacion + .hoja-evaluacion { break-before: page; }`}</style>
      <div className="w-full max-w-[860px] rounded-2xl border border-edge bg-white p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/sucursales/${id}/accion-medica`} className="text-sm text-brass underline underline-offset-2 hover:text-ink">
            ← Volver a Acción médica
          </Link>
          <p className="text-sm text-neutral-600">
            {hojas.length} evaluaci{hojas.length === 1 ? "ón firmada" : "ones firmadas"}
          </p>
          <BotonImprimir />
        </div>
        {hojas.length === 0 ? (
          <p className="text-sm text-neutral-600">Todavía no hay evaluaciones médicas firmadas en esta sede.</p>
        ) : (
          <div className="space-y-12 print:space-y-0">
            {hojas.map((h) => (
              <HojaEvaluacionMedica key={h.nombre} d={h} sede={sucursal.nombre} />
            ))}
          </div>
        )}
        <PieImpresion />
      </div>
    </div>
  );
}
