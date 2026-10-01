import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import {
  BotonPdfSignos,
  ENCABEZADOS_SIGNOS,
  FilaSignosVitales,
  SelectorFechaSignos,
} from "@/components/SignosVitales";
import { hoyArgentina } from "@/lib/fechas";
import type { SignosVitales } from "./actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { fecha?: string };

export default async function EnfermeriaSedePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { fecha: fechaParam } = await searchParams;
  const hoy = hoyArgentina();
  // La planilla es diaria: arranca en hoy y se puede elegir otro día (no futuro).
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) && fechaParam <= hoy ? fechaParam : hoy;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase.from("sucursales").select("id, nombre").eq("id", id).single<{ id: string; nombre: string }>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido, habitacion")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<{ id: string; nombre: string; apellido: string; habitacion: string | null }[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  const lista = residentes ?? [];
  const { data: registros } = lista.length
    ? await supabase
        .from("signos_vitales")
        .select("residente_id, fecha, tension_arterial, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_o2, temperatura")
        .eq("fecha", fecha)
        .in(
          "residente_id",
          lista.map((r) => r.id),
        )
        .returns<SignosVitales[]>()
    : { data: [] as SignosVitales[] };

  const porResidente = new Map((registros ?? []).map((r) => [r.residente_id, r]));
  const cargados = porResidente.size;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "enfermeria", area: "medicina" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Enfermería</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Control diario de signos vitales. Cargá los valores de cada residente y tocá Guardar (o Enter).
            </p>
          </div>
          <BotonPdfSignos
            filtro={{ sucursalId: id }}
            mesInicial={fecha.slice(0, 7)}
            etiqueta="Imprimir todas (PDF)"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelectorFechaSignos fecha={fecha} hoy={hoy} />
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{cargados}</span> de {lista.length} residentes con control
            cargado
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Residente</th>
                {ENCABEZADOS_SIGNOS.map((e) => (
                  <th key={e} className="px-1.5 py-2">
                    {e}
                  </th>
                ))}
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <FilaSignosVitales
                  key={`${r.id}-${fecha}`}
                  residenteId={r.id}
                  fecha={fecha}
                  registro={porResidente.get(r.id)}
                  etiqueta={
                    <>
                      <Link href={`/residentes/${r.id}/enfermeria`} className="font-medium text-ink hover:text-brass">
                        {r.apellido}, {r.nombre}
                      </Link>
                      {r.habitacion && <span className="block text-xs text-ink-soft">Hab. {r.habitacion}</span>}
                    </>
                  }
                />
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-soft">
                    No hay residentes activos en esta sede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
