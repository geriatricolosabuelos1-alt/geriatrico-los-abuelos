import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { HistorialEvoluciones } from "@/components/HistorialEvoluciones";
import { EvolucionForm } from "@/components/EvolucionForm";
import { KardexInteractivo } from "@/components/KardexInteractivo";
import {
  listarCambiosRecientes,
  listarCatalogo,
  listarEvolucionesMedicas,
  listarInterconsultas,
  listarKardexResidente,
  tienePinConfigurado,
} from "@/app/residentes/[id]/accion-medica/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = { id: string; nombre: string; apellido: string; sucursal_id: string; habitacion: string | null };

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

  const { data: listaSucursal } = await supabase
    .from("residentes")
    .select("id")
    .eq("sucursal_id", residente.sucursal_id)
    .eq("activo", true)
    .order("habitacion")
    .returns<{ id: string }[]>();

  const orden = (listaSucursal ?? []).map((r) => r.id);
  const indiceActual = orden.indexOf(id);
  const siguienteId = indiceActual >= 0 && indiceActual < orden.length - 1 ? orden[indiceActual + 1] : null;

  const [evoluciones, kardex, catalogo, interconsultas, cambios, pinConfigurado] = await Promise.all([
    listarEvolucionesMedicas(id),
    listarKardexResidente(id),
    listarCatalogo(),
    listarInterconsultas(id),
    listarCambiosRecientes(id),
    tienePinConfigurado(),
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
          <HistorialEvoluciones residenteId={id} evoluciones={evoluciones} />

          <KardexInteractivo
            residenteId={id}
            kardex={kardex}
            catalogo={catalogo}
            cambiosRecientes={cambios}
          />
          <EvolucionForm
            residenteId={id}
            siguienteResidenteId={siguienteId}
            interconsultas={interconsultas}
            pinConfigurado={pinConfigurado}
          />
        </div>
      </main>
    </div>
  );
}
