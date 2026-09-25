import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type ResidenteKinesio = {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  kinesiologia_evaluaciones: { fecha: string; riesgo_caida: string | null }[];
  kinesiologia_sesiones: { fecha: string }[];
};

function formatearFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");
}

export default async function KinesiologiaSedePage({ params }: { params: Promise<Params> }) {
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
      .select(
        "id, nombre, apellido, habitacion, kinesiologia_evaluaciones(fecha, riesgo_caida), kinesiologia_sesiones(fecha)",
      )
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<ResidenteKinesio[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  const mesActual = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .format(new Date())
    .slice(0, 7);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "kinesiologia", area: "medicina" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Kinesiología</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Evaluación inicial y sesiones de cada residente. Elegí un residente para cargar.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-2">Residente</th>
                <th className="px-4 py-2">Última evaluación</th>
                <th className="px-4 py-2">Riesgo de caída</th>
                <th className="px-4 py-2 text-right">Sesiones este mes</th>
                <th className="px-4 py-2 text-right">Última sesión</th>
              </tr>
            </thead>
            <tbody>
              {(residentes ?? []).map((r) => {
                const evals = [...r.kinesiologia_evaluaciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
                const sesiones = [...r.kinesiologia_sesiones].sort((a, b) => b.fecha.localeCompare(a.fecha));
                const delMes = sesiones.filter((s) => s.fecha.startsWith(mesActual)).length;
                return (
                  <tr key={r.id} className="border-t border-edge">
                    <td className="px-4 py-2">
                      <Link href={`/residentes/${r.id}/kinesiologia`} className="font-medium text-ink hover:text-brass">
                        {r.apellido}, {r.nombre}
                      </Link>
                      {r.habitacion && <span className="ml-2 text-xs text-ink-soft">Hab. {r.habitacion}</span>}
                    </td>
                    <td className="px-4 py-2 text-ink-soft">
                      {evals[0] ? (
                        formatearFecha(evals[0].fecha)
                      ) : (
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800">
                          Sin evaluar
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-2 ${
                        evals[0]?.riesgo_caida === "Alto" ? "font-semibold text-red-700" : "text-ink-soft"
                      }`}
                    >
                      {evals[0]?.riesgo_caida ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-ink">{delMes}</td>
                    <td className="px-4 py-2 text-right text-ink-soft">
                      {sesiones[0] ? formatearFecha(sesiones[0].fecha) : "—"}
                    </td>
                  </tr>
                );
              })}
              {(residentes ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
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
