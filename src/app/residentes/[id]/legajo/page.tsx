import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { LegajoForm } from "@/components/LegajoForm";
import {
  listarAlertasActivas,
  listarCatalogoMedicamentos,
  listarMedicamentos,
  actualizarTomasAutomaticas,
} from "@/app/residentes/[id]/legajo/medicacion-actions";
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

  await actualizarTomasAutomaticas();
  const [medicamentos, alertasMedicacion, catalogoMedicamentos, { data: insumosAportados }] = await Promise.all([
    listarMedicamentos(id),
    listarAlertasActivas(id),
    listarCatalogoMedicamentos(),
    supabase
      .from("movimientos_inventario")
      .select("id, fecha, cantidad, insumos(nombre, unidad)")
      .eq("residente_id", id)
      .eq("tipo", "entrada")
      .order("fecha", { ascending: false })
      .returns<{ id: string; fecha: string; cantidad: number; insumos: { nombre: string; unidad: string } | null }[]>(),
  ]);

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
              href={`/residentes/${id}/legajo/completo`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Legajo completo (PDF)
            </Link>
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
            <Link
              href={`/residentes/${id}/kinesiologia`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Kinesiología
            </Link>
            <Link
              href={`/residentes/${id}/enfermeria`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Signos vitales
            </Link>
          </div>
        </div>

        <LegajoForm
          residente={residente}
          fichaAdministrativa={fichaAdministrativa ?? null}
          fichaMedica={fichaMedica ?? null}
          rolActual={perfil.rol}
          medicamentos={medicamentos}
          alertasMedicacion={alertasMedicacion}
          catalogoMedicamentos={catalogoMedicamentos}
        />

        <section className="rounded-2xl border border-edge bg-card p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Insumos aportados por la familia</h2>
          {(insumosAportados ?? []).length === 0 ? (
            <p className="text-sm text-ink-soft">
              Todavía no hay insumos aportados. Se cargan en Inventario → Registrar movimiento → Ingreso, tildando
              &quot;Lo aportó un residente&quot;.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                  <th className="py-1.5 pr-4">Fecha</th>
                  <th className="py-1.5 pr-4">Insumo</th>
                  <th className="py-1.5">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {(insumosAportados ?? []).map((m) => (
                  <tr key={m.id} className="border-t border-edge">
                    <td className="py-1.5 pr-4 text-ink-soft">
                      {new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" })}
                    </td>
                    <td className="py-1.5 pr-4 text-ink">{m.insumos?.nombre ?? "—"}</td>
                    <td className="py-1.5 text-ink">
                      {m.cantidad} {m.insumos?.unidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
