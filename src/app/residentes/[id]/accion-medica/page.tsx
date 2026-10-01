import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { KardexInteractivo } from "@/components/KardexInteractivo";
import {
  listarCambiosRecientes,
  listarCatalogo,
  listarKardexResidente,
} from "@/app/residentes/[id]/accion-medica/actions";
import { listarInterconsultasCompletas } from "@/app/residentes/[id]/accion-medica/interconsultas-actions";
import { InterconsultasResidente } from "@/components/InterconsultasResidente";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = {
  id: string;
  nombre: string;
  apellido: string;
  sucursal_id: string;
  habitacion: string | null;
};

export default async function AccionMedicaResidentePage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const { data: residente } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, sucursal_id, habitacion")
    .eq("id", id)
    .single<ResidenteBasico>();

  if (!residente || !perfil) notFound();

  const [kardex, catalogo, cambios, interconsultasCompletas] = await Promise.all([
    listarKardexResidente(id),
    listarCatalogo(),
    listarCambiosRecientes(id),
    listarInterconsultasCompletas(id),
  ]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: residente.sucursal_id, seccion: "accion-medica", area: "medicina" }}
      />

      <main className="flex-1 px-9 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">Acción Médica</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">
            {residente.apellido}, {residente.nombre}
          </h1>
          {residente.habitacion && <p className="text-sm text-ink-soft">Hab. {residente.habitacion}</p>}
        </div>

        <div className="space-y-6">
          <KardexInteractivo
            residenteId={id}
            kardex={kardex}
            catalogo={catalogo}
            cambiosRecientes={cambios}
          />
          <InterconsultasResidente
            residenteId={id}
            interconsultas={interconsultasCompletas}
            puedeEliminar={perfil!.rol !== "medico"}
          />

          <Link
            href={`/sucursales/${residente.sucursal_id}/accion-medica/evaluacion-medica?residente=${id}`}
            className="flex items-center justify-between rounded-2xl border border-brass/40 bg-panel p-5 hover:border-brass"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Evaluación médica</h2>
              <p className="text-sm text-ink-soft">Evaluación + indicaciones médicas, documento único con firma.</p>
            </div>
            <span className="text-brass">→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
