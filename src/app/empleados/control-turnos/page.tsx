import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { controlDeTurnos, type EstadoTurno } from "@/app/empleados/control-turnos-actions";
import type { Perfil, Sucursal } from "@/lib/types";

type SearchParams = { sucursal?: string; fecha?: string };

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const ETIQUETA_ESTADO: Record<EstadoTurno, { texto: string; clase: string }> = {
  cubierto: { texto: "Cubierto", clase: "bg-green-700/10 text-green-700" },
  incompleto: { texto: "Entrada sin salida", clase: "bg-amber-600/10 text-amber-700" },
  ausente: { texto: "No se presentó", clase: "bg-red-700/10 text-red-700" },
};

export default async function ControlTurnosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { sucursal: sucursalParam, fecha: fechaParam } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursales }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("sucursales")
      .select("id, nombre, direccion, capacidad_camas")
      .order("nombre")
      .returns<Sucursal[]>(),
  ]);

  const listaSucursales = sucursales ?? [];
  const sucursalId = sucursalParam || listaSucursales[0]?.id || "";
  const fecha = fechaParam || hoy();

  const { filas, sinTurno } = sucursalId
    ? await controlDeTurnos(sucursalId, fecha)
    : { filas: [], sinTurno: [] };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              Empleados
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Control de turnos</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Compara el turno semanal programado contra la marcación real de ingreso/egreso.
            </p>
          </div>
          <Link
            href="/empleados"
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            Volver a Empleados
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
              Sede
            </label>
            <select
              name="sucursal"
              defaultValue={sucursalId}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {listaSucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
              Fecha
            </label>
            <input
              type="date"
              name="fecha"
              defaultValue={fecha}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Ver
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Turno programado</th>
                <th className="px-4 py-3">Entrada real</th>
                <th className="px-4 py-3">Salida real</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const estado = ETIQUETA_ESTADO[f.estado];
                return (
                  <tr key={f.empleadoId} className="border-b border-edge last:border-0">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{f.nombre}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {f.horaInicioProgramada.slice(0, 5)}–{f.horaFinProgramada.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {f.horaEntradaReal ? f.horaEntradaReal.slice(0, 5) : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {f.horaSalidaReal ? f.horaSalidaReal.slice(0, 5) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                    No hay turnos programados para ese día en esta sede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sinTurno.length > 0 && (
          <div className="rounded-2xl border border-edge bg-card p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">
              Marcaron sin turno asignado ese día
            </h2>
            <div className="space-y-2">
              {sinTurno.map((f) => (
                <div
                  key={f.empleadoId}
                  className="flex items-center justify-between rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm"
                >
                  <span className="font-medium text-ink">{f.nombre}</span>
                  <span className="text-ink-soft">
                    {f.horaEntradaReal ? f.horaEntradaReal.slice(0, 5) : "—"}
                    {" – "}
                    {f.horaSalidaReal ? f.horaSalidaReal.slice(0, 5) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
