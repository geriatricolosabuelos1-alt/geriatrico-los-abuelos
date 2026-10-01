import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { FormularioTurnoPrograma } from "@/components/FormularioTurnoPrograma";
import { TablaTurnosSemanal } from "@/components/TablaTurnosSemanal";
import { ExportarPdfTurnos } from "@/components/ExportarPdfTurnos";
import { CambiosTurno } from "@/components/CambiosTurno";
import { listarCambiosTurno, listarTurnosProgramados } from "@/app/empleados/turnos-actions";
import type { Perfil, Sucursal } from "@/lib/types";

type SearchParams = { sucursal?: string; empleado?: string };
type EmpleadoOpcion = { id: string; nombre_completo: string; sucursal_id: string };

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { sucursal: sucursalParam, empleado: empleadoParam } = await searchParams;

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

  const [turnosSede, cambiosSede] = sucursalId
    ? await Promise.all([listarTurnosProgramados(sucursalId), listarCambiosTurno(sucursalId)])
    : [[], []];
  const empleadosDeSede = (empleados ?? []).filter((e) => e.sucursal_id === sucursalId);
  const empleadosPorId = new Map(empleadosDeSede.map((e) => [e.id, e.nombre_completo]));

  // Filtro por empleado: la tabla y la lista de cambios muestran solo lo suyo.
  const empleadoFiltro = empleadoParam && empleadosPorId.has(empleadoParam) ? empleadoParam : "";
  const turnos = empleadoFiltro ? turnosSede.filter((t) => t.empleado_id === empleadoFiltro) : turnosSede;
  const cambios = empleadoFiltro
    ? cambiosSede.filter(
        (c) => c.empleado_original_id === empleadoFiltro || c.empleado_reemplazo_id === empleadoFiltro,
      )
    : cambiosSede;

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
              Turnos semanales
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Turno programado por día de la semana. Se repite automáticamente todas las semanas
              hasta la fecha de vigencia (por defecto, fin de año).
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
              Empleado
            </label>
            <select
              name="empleado"
              defaultValue={empleadoFiltro}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              <option value="">Todos</option>
              {empleadosDeSede.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Ver
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          <FormularioTurnoPrograma sucursalId={sucursalId} empleados={empleadosDeSede} />
        </div>

        <ExportarPdfTurnos
          key={empleadoFiltro}
          turnos={turnosSede}
          cambios={cambiosSede}
          empleadosPorId={empleadosPorId}
          sucursalNombre={listaSucursales.find((s) => s.id === sucursalId)?.nombre ?? "Sede"}
          empleadoInicial={empleadoFiltro}
        />

        <TablaTurnosSemanal turnos={turnos} empleadosPorId={empleadosPorId} />

        <CambiosTurno sucursalId={sucursalId} empleados={empleadosDeSede} cambios={cambios} />
      </main>
    </div>
  );
}
