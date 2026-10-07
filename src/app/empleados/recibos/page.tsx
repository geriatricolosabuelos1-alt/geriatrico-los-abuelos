import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { formatearMonto } from "@/lib/finanzas";
import type { Perfil } from "@/lib/types";

const ROLES_SUELDOS = ["admin", "gerente_sede", "administrativo"];

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Busqueda = { periodo?: string; q?: string };

type FilaRecibo = {
  empleado_id: string;
  periodo: string;
  fecha_pago: string | null;
  neto: number;
  empleados: EmpleadoRelacion | EmpleadoRelacion[] | null;
};

type EmpleadoRelacion = {
  nombre_completo: string;
  sucursales: { nombre: string } | { nombre: string }[] | null;
};

function uno<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-");
  return `${MESES[Number(mes)] ?? mes} ${anio}`;
}

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

export default async function RecibosSueldoPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}) {
  const { periodo: periodoParam, q: consulta } = await searchParams;
  const periodo = periodoParam && /^\d{4}-\d{2}$/.test(periodoParam) ? periodoParam : "";
  const texto = (consulta ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  if (!perfil || !ROLES_SUELDOS.includes(perfil.rol)) notFound();

  const { data } = await supabase
    .from("recibos_sueldo")
    .select("empleado_id, periodo, fecha_pago, neto, empleados(nombre_completo, sucursales(nombre))")
    .order("periodo", { ascending: false })
    .limit(1000)
    .returns<FilaRecibo[]>();

  const filas = (data ?? [])
    .map((r) => {
      const empleado = uno(r.empleados);
      return {
        ...r,
        nombre: empleado?.nombre_completo ?? "—",
        sede: uno(empleado?.sucursales ?? null)?.nombre ?? "—",
      };
    })
    .filter((r) => !periodo || r.periodo === periodo)
    .filter((r) => !texto || sinTildes(r.nombre).includes(sinTildes(texto)))
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.nombre.localeCompare(b.nombre, "es"));

  const totalNeto = filas.reduce((acc, r) => acc + Number(r.neto), 0);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">Empleados</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Recibos de sueldo</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Todos los recibos generados. Se guardan al imprimirlos; desde acá los podés abrir y reimprimir.
            </p>
          </div>
          <Link
            href="/empleados"
            className="rounded-full border border-edge px-4 py-2 text-sm font-semibold text-ink-soft hover:border-brass hover:text-ink"
          >
            ← Volver a empleados
          </Link>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Mes
            <input
              type="month"
              name="periodo"
              defaultValue={periodo}
              className="mt-1 block rounded-lg border border-edge bg-card px-3 py-2 text-sm font-normal normal-case text-ink focus:border-brass focus:outline-none"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Empleado
            <input
              type="search"
              name="q"
              defaultValue={texto}
              placeholder="Buscar por nombre"
              className="mt-1 block w-60 rounded-lg border border-edge bg-card px-3 py-2 text-sm font-normal normal-case text-ink focus:border-brass focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
          >
            Filtrar
          </button>
          {(periodo || texto) && (
            <Link href="/empleados/recibos" className="py-2 text-sm text-ink-soft underline hover:text-ink">
              Limpiar
            </Link>
          )}
        </form>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3">Fecha de pago</th>
                <th className="px-4 py-3 text-right">Neto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <tr key={`${r.empleado_id}-${r.periodo}`} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 text-ink">{etiquetaPeriodo(r.periodo)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{r.nombre}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.sede}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatearFecha(r.fecha_pago)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">
                    {formatearMonto(Number(r.neto))}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/empleados/${r.empleado_id}/recibo?periodo=${r.periodo}`}
                      className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Ver / imprimir
                    </Link>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                    {periodo || texto
                      ? "No hay recibos que coincidan con el filtro."
                      : "Todavía no se generó ningún recibo. Se guardan al imprimirlos desde Empleados > Recibo."}
                  </td>
                </tr>
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-edge bg-panel-deep">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {filas.length} recibo{filas.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                    {formatearMonto(totalNeto)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  );
}
