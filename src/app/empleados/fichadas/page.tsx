import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { TablaFichadas } from "@/components/TablaFichadas";
import { listarFichadas } from "@/app/empleados/fichadas-actions";
import type { Perfil, Sucursal } from "@/lib/types";
import { mesAnioArgentina } from "@/lib/fechas";

type SearchParams = { sucursal?: string; mes?: string; anio?: string };
type EmpleadoOpcion = { id: string; nombre_completo: string; sucursal_id: string };

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function FichadasPage({
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
      .order("nombre_completo")
      .returns<EmpleadoOpcion[]>(),
  ]);

  const listaSucursales = sucursales ?? [];
  const sucursalId = sucursalParam || listaSucursales[0]?.id || "";
  const ahora = mesAnioArgentina();
  const mes = Number(mesParam) || ahora.mes;
  const anio = Number(anioParam) || ahora.anio;

  const empleadosDeSede = (empleados ?? []).filter((e) => e.sucursal_id === sucursalId);
  const empleadosPorId = new Map(empleadosDeSede.map((e) => [e.id, e.nombre_completo]));

  const fichadas = await listarFichadas(
    mes,
    anio,
    empleadosDeSede.map((e) => e.id),
  );

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
              Fichado (ingreso / egreso)
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Registros cargados por los empleados desde la pantalla de fichado con su DNI.
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

        <TablaFichadas fichadas={fichadas} empleadosPorId={empleadosPorId} />
      </main>
    </div>
  );
}
