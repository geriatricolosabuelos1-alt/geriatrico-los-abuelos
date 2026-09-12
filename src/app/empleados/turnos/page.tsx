import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { FormularioTurno } from "@/components/FormularioTurno";
import { TablaTurnos } from "@/components/TablaTurnos";
import { listarTurnos } from "@/app/empleados/turnos-actions";
import type { Perfil, Sucursal } from "@/lib/types";

type SearchParams = { sucursal?: string; mes?: string; anio?: string };

type EmpleadoOpcion = { id: string; nombre_completo: string; sucursal_id: string };

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { sucursal: sucursalParam, mes: mesParam, anio: anioParam } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursales }, { data: empleados }] = await Promise.all([
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
    supabase
      .from("empleados")
      .select("id, nombre_completo, sucursal_id")
      .eq("activo", true)
      .order("nombre_completo")
      .returns<EmpleadoOpcion[]>(),
  ]);

  const listaSucursales = sucursales ?? [];
  const sucursalId = sucursalParam || listaSucursales[0]?.id || "";
  const ahora = new Date();
  const mes = Number(mesParam) || ahora.getMonth() + 1;
  const anio = Number(anioParam) || ahora.getFullYear();

  const turnos = sucursalId ? await listarTurnos(sucursalId, mes, anio) : [];
  const empleadosDeSede = (empleados ?? []).filter((e) => e.sucursal_id === sucursalId);

  const empleadosPorId = new Map(empleadosDeSede.map((e) => [e.id, e.nombre_completo]));

  const totalesPorEmpleado = new Map<string, number>();
  turnos.forEach((t) => {
    totalesPorEmpleado.set(t.empleado_id, (totalesPorEmpleado.get(t.empleado_id) ?? 0) + t.horas);
  });

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              Empleados
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">
              Turnos cubiertos
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Registro administrativo de cobertura de turnos — no es un control de asistencia.
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
              Mes
            </label>
            <select
              name="mes"
              defaultValue={mes}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {MESES.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
              Año
            </label>
            <input
              type="number"
              name="anio"
              defaultValue={anio}
              className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Ver
          </button>
        </form>

        <FormularioTurno sucursalId={sucursalId} empleados={empleadosDeSede} fecha={`${anio}-${String(mes).padStart(2, "0")}-01`} />

        {totalesPorEmpleado.size > 0 && (
          <div className="rounded-2xl border border-edge bg-card p-5">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">
              Total de horas del mes por empleado
            </h2>
            <div className="flex flex-wrap gap-4">
              {Array.from(totalesPorEmpleado.entries()).map(([empleadoId, horas]) => (
                <div key={empleadoId} className="rounded-xl border border-edge bg-panel-deep px-4 py-2">
                  <p className="text-xs text-ink-soft">
                    {empleadosPorId.get(empleadoId) ?? "—"}
                  </p>
                  <p className="font-display text-lg font-semibold text-ink">{horas} hs</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <TablaTurnos turnos={turnos} empleadosPorId={empleadosPorId} />
      </main>
    </div>
  );
}
