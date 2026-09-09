import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { LegajoForm } from "@/components/LegajoForm";
import type { FichaAdministrativa, FichaMedica, Perfil, Residente } from "@/lib/types";

type Params = { id: string };

export default async function LegajoResidentePage({
  params,
}: {
  params: Promise<Params>;
}) {
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

  const { data: residente, error: errorResidente } = await supabase
    .from("residentes")
    .select(
      "id, sucursal_id, nombre, apellido, fecha_nacimiento, dni, nacionalidad, fecha_ingreso, fecha_egreso, habitacion, contacto_familiar, telefono_familiar, observaciones_medicas, foto_url, activo, nivel_cuidado",
    )
    .eq("id", id)
    .single<Residente>();

  if (errorResidente) {
    console.error("[legajo] error al leer residente:", errorResidente);
  }

  if (!residente || !perfil) {
    notFound();
  }

  const { data: fichaAdministrativa } = await supabase
    .from("ficha_administrativa")
    .select(
      "residente_id, obra_social, numero_afiliado, tipo_cobertura, cuota_mensual, notas_contrato, fecha_vencimiento_cuota, mecanismo_actualizacion, cud_vencimiento, contratante_nombre, contratante_dni, contratante_domicilio",
    )
    .eq("residente_id", id)
    .maybeSingle<FichaAdministrativa>();

  const { data: fichaMedica } = await supabase
    .from("ficha_medica")
    .select(
      "residente_id, medico_cabecera, medico_emergencia, telefono_emergencia_medica, grupo_sanguineo, alergias, diagnosticos",
    )
    .eq("residente_id", id)
    .maybeSingle<FichaMedica>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{
          tipo: "sucursal",
          sucursalId: residente.sucursal_id,
          seccion: "residentes",
        }}
      />

      <main className="w-full flex-1 space-y-6 px-9 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
              Legajo
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">
              {residente.apellido}, {residente.nombre}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/residentes/${id}/contrato`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Ver contrato
            </Link>
            <Link
              href={`/residentes/${id}/evolucion`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Ver evolución
            </Link>
          </div>
        </div>

        <LegajoForm
          residente={residente}
          fichaAdministrativa={fichaAdministrativa ?? null}
          fichaMedica={fichaMedica ?? null}
        />
      </main>
    </div>
  );
}
