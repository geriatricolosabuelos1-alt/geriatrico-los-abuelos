import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { SelectorResidenteEvaluacion } from "@/components/SelectorResidenteEvaluacion";
import Link from "next/link";
import {
  listarPendientesFirma,
  listarResidentesSede,
} from "@/app/residentes/[id]/accion-medica/evaluacion-actions";
import { tienePinConfigurado } from "@/app/residentes/[id]/accion-medica/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { residente?: string };

export default async function EvaluacionMedicaPlantillaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { residente: residenteIdInicial } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, residentes, pinConfigurado, pendientes] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase.from("sucursales").select("id, nombre").eq("id", id).single<{ id: string; nombre: string }>(),
    listarResidentesSede(id),
    tienePinConfigurado(),
    listarPendientesFirma(id),
  ]);

  if (!sucursal || !perfil) notFound();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "accion-medica", area: "medicina" }}
      />

      <main className="flex-1 px-9 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Evaluación médica</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Plantilla única de evaluación + indicaciones médicas. Elegí el residente y completá el documento.
          </p>
        </div>

        {pendientes.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-900">
              {pendientes.length} evaluaci{pendientes.length === 1 ? "ón" : "ones"} pendiente
              {pendientes.length === 1 ? "" : "s"} de firma médica
            </p>
            <ul className="flex flex-wrap gap-2">
              {pendientes.map((p) => (
                <li key={`${p.residenteId}-${p.fecha}`}>
                  <Link
                    href={`/sucursales/${id}/accion-medica/evaluacion-medica?residente=${p.residenteId}`}
                    className="inline-block rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                  >
                    {p.nombre} · {p.fecha.split("-").reverse().join("/")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <SelectorResidenteEvaluacion
          key={residenteIdInicial ?? "ninguno"}
          residentes={residentes}
          pinConfigurado={pinConfigurado}
          residenteIdInicial={residenteIdInicial ?? null}
          esMedico={perfil!.rol === "medico"}
        />
      </main>
    </div>
  );
}
