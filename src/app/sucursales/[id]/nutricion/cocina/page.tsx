import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ExportarPdfCocina } from "@/components/ExportarPdfCocina";
import { listarPrescripcionActiva, listarRestricciones } from "@/app/sucursales/[id]/nutricion/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
};

const ETIQUETA_DIETA: Record<string, string> = {
  general: "General",
  hiposodica_estricta: "Hiposódica estricta",
  hiposodica_moderada: "Hiposódica moderada",
  diabetica: "Diabética",
  astringente: "Astringente",
  rica_en_fibra: "Rica en fibra",
  renal: "Renal",
};

const ETIQUETA_IDDSI: Record<string, string> = {
  "7": "Normal",
  "6": "Blanda / cortada",
  "5": "Picada y húmeda",
  "4": "Papilla / puré",
};

export default async function CocinaPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
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
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido, habitacion")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("habitacion")
      .returns<ResidenteBasico[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  const listaResidentes = residentes ?? [];
  const filas = await Promise.all(
    listaResidentes.map(async (r) => ({
      residente: r,
      prescripcion: await listarPrescripcionActiva(r.id),
      restricciones: await listarRestricciones(r.id),
    })),
  );

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "nutricion",
          subseccion: "cocina",
          area: "medicina",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Sábana de cocina</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Dieta y consistencia de cada residente, para el cocinero y camareros de hoy.
            </p>
          </div>
          <ExportarPdfCocina
            sucursalNombre={sucursal!.nombre}
            filas={filas.map(({ residente, prescripcion, restricciones }) => ({
              habitacion: residente.habitacion ?? "—",
              residente: `${residente.apellido}, ${residente.nombre}`,
              dieta: prescripcion ? ETIQUETA_DIETA[prescripcion.tipo_dieta] : "—",
              consistencia: prescripcion ? ETIQUETA_IDDSI[prescripcion.nivel_iddsi] : "—",
              liquidos: prescripcion && prescripcion.tipo_liquido !== "normal" ? prescripcion.tipo_liquido : "—",
              exclusiones: restricciones.length > 0 ? restricciones.map((r) => r.detalle).join(", ") : "—",
            }))}
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Hab.</th>
                <th className="px-3 py-2">Residente</th>
                <th className="px-3 py-2">Dieta</th>
                <th className="px-3 py-2">Consistencia</th>
                <th className="px-3 py-2">Líquidos</th>
                <th className="px-3 py-2">Exclusiones / preferencias</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ residente, prescripcion, restricciones }) => (
                <tr key={residente.id} className="border-t border-edge">
                  <td className="px-3 py-2 text-sm text-ink-soft">{residente.habitacion ?? "—"}</td>
                  <td className="px-3 py-2 text-sm font-medium text-ink">
                    {residente.apellido}, {residente.nombre}
                  </td>
                  <td className="px-3 py-2 text-sm text-ink">
                    {prescripcion ? ETIQUETA_DIETA[prescripcion.tipo_dieta] : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-ink">
                    {prescripcion ? ETIQUETA_IDDSI[prescripcion.nivel_iddsi] : "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-ink-soft">
                    {prescripcion && prescripcion.tipo_liquido !== "normal" ? prescripcion.tipo_liquido : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-red-700">
                    {restricciones.length > 0
                      ? restricciones.map((r) => r.detalle).join(", ")
                      : "—"}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-ink-soft">
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
