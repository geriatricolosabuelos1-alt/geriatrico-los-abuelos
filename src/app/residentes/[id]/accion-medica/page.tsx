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
import { listarInterconsultasCompletas } from "@/app/residentes/[id]/accion-medica/interconsultas-actions";
import {
  listarEvaluacionesMedicas,
  listarIndicacionesMedicas,
} from "@/app/residentes/[id]/accion-medica/evaluacion-actions";
import { InterconsultasResidente } from "@/components/InterconsultasResidente";
import { EvaluacionMedicaForm } from "@/components/EvaluacionMedicaForm";
import { IndicacionesMedicasForm } from "@/components/IndicacionesMedicasForm";
import { HistorialEvaluacionesMedicas } from "@/components/HistorialEvaluacionesMedicas";
import { HistorialIndicacionesMedicas } from "@/components/HistorialIndicacionesMedicas";
import { ExportarPdfEvaluacionMedica } from "@/components/ExportarPdfEvaluacionMedica";
import { calcularEdad } from "@/lib/residentes";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = {
  id: string;
  nombre: string;
  apellido: string;
  sucursal_id: string;
  habitacion: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  sucursales: { nombre: string } | null;
  ficha_administrativa: { obra_social: string | null; numero_afiliado: string | null } | null;
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
    .select(
      "id, nombre, apellido, sucursal_id, habitacion, dni, fecha_nacimiento, sucursales(nombre), ficha_administrativa(obra_social, numero_afiliado)",
    )
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

  const [
    evoluciones,
    kardex,
    catalogo,
    interconsultas,
    cambios,
    pinConfigurado,
    interconsultasCompletas,
    evaluacionesMedicas,
    indicacionesMedicas,
  ] = await Promise.all([
    listarEvolucionesMedicas(id),
    listarKardexResidente(id),
    listarCatalogo(),
    listarInterconsultas(id),
    listarCambiosRecientes(id),
    tienePinConfigurado(),
    listarInterconsultasCompletas(id),
    listarEvaluacionesMedicas(id),
    listarIndicacionesMedicas(id),
  ]);

  const edad = calcularEdad(residente.fecha_nacimiento);

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
          <InterconsultasResidente
            residenteId={id}
            interconsultas={interconsultasCompletas}
            puedeEliminar={perfil!.rol !== "medico"}
          />

          <div className="rounded-2xl border border-edge bg-panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-ink">Evaluación médica</h2>
              <ExportarPdfEvaluacionMedica
                residenteNombre={`${residente.apellido}, ${residente.nombre}`}
                sede={residente.sucursales?.nombre ?? ""}
                dni={residente.dni}
                edad={edad}
                fechaNacimiento={residente.fecha_nacimiento}
                obraSocial={residente.ficha_administrativa?.obra_social ?? null}
                afiliado={residente.ficha_administrativa?.numero_afiliado ?? null}
                evaluacion={evaluacionesMedicas[0] ?? null}
                indicacion={indicacionesMedicas[0] ?? null}
              />
            </div>

            <div className="space-y-4">
              <EvaluacionMedicaForm residenteId={id} pinConfigurado={pinConfigurado} />
              <IndicacionesMedicasForm
                residenteId={id}
                pinConfigurado={pinConfigurado}
                ultimaIndicacion={indicacionesMedicas[0] ?? null}
              />
              <HistorialEvaluacionesMedicas evaluaciones={evaluacionesMedicas} />
              <HistorialIndicacionesMedicas indicaciones={indicacionesMedicas} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
