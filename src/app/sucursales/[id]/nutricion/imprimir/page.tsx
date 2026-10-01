import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";
import { HojaFichaNutricion, type DatosPacienteNutricion } from "@/components/HojaFichaNutricion";
import { listarFichasNutricion } from "@/app/sucursales/[id]/nutricion/actions";
import type { FichaNutricion } from "@/lib/nutricion";
import { hoyArgentina } from "@/lib/fechas";

type Params = { id: string };
type Busqueda = { residente?: string; mes?: string };

// Formulario de Nutrición del mes para imprimir: un residente o todos (sin ficha del mes, sale en blanco).
export default async function ImprimirNutricionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Busqueda>;
}) {
  const { id } = await params;
  const { residente, mes } = await searchParams;
  const periodo = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoyArgentina().slice(0, 7);
  const supabase = await createClient();

  let consulta = supabase
    .from("residentes")
    .select("id, nombre, apellido, dni, fecha_nacimiento")
    .eq("sucursal_id", id)
    .order("apellido");
  consulta = residente ? consulta.eq("id", residente) : consulta.eq("activo", true);
  const { data: residentes } = await consulta.returns<
    { id: string; nombre: string; apellido: string; dni: string | null; fecha_nacimiento: string | null }[]
  >();
  if (!residentes) notFound();

  const ids = residentes.map((r) => r.id);
  const [fichas, { data: administrativas }] = await Promise.all([
    listarFichasNutricion(ids),
    // La obra social solo la ve quien tiene acceso a lo administrativo; si no, queda la línea en blanco.
    ids.length > 0
      ? supabase
          .from("ficha_administrativa")
          .select("residente_id, obra_social")
          .in("residente_id", ids)
          .returns<{ residente_id: string; obra_social: string | null }[]>()
      : Promise.resolve({ data: [] as { residente_id: string; obra_social: string | null }[] }),
  ]);
  const obraSocial = new Map((administrativas ?? []).map((a) => [a.residente_id, a.obra_social]));

  const fichaDe = (residenteId: string): FichaNutricion | null => {
    const propias = fichas.filter((f) => f.residente_id === residenteId);
    return propias.find((f) => f.periodo === periodo) ?? null;
  };

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 12mm; } .hoja-nutricion:last-child { break-after: auto; }`}</style>
      <div className="w-full max-w-[860px] rounded-2xl border border-edge bg-white p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link href={`/sucursales/${id}/nutricion?mes=${periodo}`} className="text-sm text-brass underline underline-offset-2 hover:text-ink">
            ← Volver a Nutrición
          </Link>
          <BotonImprimir />
        </div>
        {residentes.length === 0 ? (
          <p className="text-sm text-neutral-600">No hay residentes para imprimir.</p>
        ) : (
          <div className="space-y-12 print:space-y-0">
            {residentes.map((r) => {
              const paciente: DatosPacienteNutricion = {
                nombre: r.nombre,
                apellido: r.apellido,
                dni: r.dni,
                fecha_nacimiento: r.fecha_nacimiento,
                obra_social: obraSocial.get(r.id) ?? null,
              };
              return <HojaFichaNutricion key={r.id} paciente={paciente} periodo={periodo} ficha={fichaDe(r.id)} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
