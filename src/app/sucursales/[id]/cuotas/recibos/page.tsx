import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { formatearMonto } from "@/lib/finanzas";
import type { Perfil } from "@/lib/types";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Params = { id: string };
type Busqueda = { periodo?: string; q?: string };

type ResidenteRelacion = { nombre: string; apellido: string };

type FilaPago = {
  id: string;
  residente_id: string;
  mes: number;
  anio: number;
  monto: number;
  monto_pagado: number;
  estado: string;
  fecha_pago: string | null;
  residentes: ResidenteRelacion | ResidenteRelacion[] | null;
};

function uno<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

export default async function RecibosResidentesPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Busqueda>;
}) {
  const { id } = await params;
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

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal || !perfil) notFound();

  const { data } = await supabase
    .from("pagos")
    .select("id, residente_id, mes, anio, monto, monto_pagado, estado, fecha_pago, residentes(nombre, apellido)")
    .eq("sucursal_id", id)
    .gt("monto_pagado", 0)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1000)
    .returns<FilaPago[]>();

  const filas = (data ?? [])
    .map((p) => {
      const residente = uno(p.residentes);
      return {
        ...p,
        nombre: residente ? `${residente.apellido}, ${residente.nombre}` : "—",
        clavePeriodo: `${p.anio}-${String(p.mes).padStart(2, "0")}`,
      };
    })
    .filter((p) => !periodo || p.clavePeriodo === periodo)
    .filter((p) => !texto || sinTildes(p.nombre).includes(sinTildes(texto)))
    .sort((a, b) => b.clavePeriodo.localeCompare(a.clavePeriodo) || a.nombre.localeCompare(b.nombre, "es"));

  const totalCobrado = filas.reduce((acc, p) => acc + Number(p.monto_pagado), 0);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil} activo={{ tipo: "sucursal", sucursalId: id, seccion: "cuotas" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Recibos emitidos</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Los períodos con algún pago registrado. Desde acá abrís el recibo de cada uno para verlo o reimprimirlo.
            </p>
          </div>
          <Link
            href={`/sucursales/${id}/cuotas`}
            className="rounded-full border border-edge px-4 py-2 text-sm font-semibold text-ink-soft hover:border-brass hover:text-ink"
          >
            ← Volver a Aranceles
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
            Residente
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
            <Link
              href={`/sucursales/${id}/cuotas/recibos`}
              className="py-2 text-sm text-ink-soft underline hover:text-ink"
            >
              Limpiar
            </Link>
          )}
        </form>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Residente</th>
                <th className="px-4 py-3 text-right">Cuota</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último pago</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => (
                <tr key={p.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {MESES[p.mes]} {p.anio}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{p.nombre}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{formatearMonto(Number(p.monto))}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-ink">
                    {formatearMonto(Number(p.monto_pagado))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.estado === "pagado" ? "bg-brass-soft text-brass" : "bg-warn text-ink"
                      }`}
                    >
                      {p.estado === "pagado" ? "Pagado" : "Parcial"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatearFecha(p.fecha_pago)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/residentes/${p.residente_id}/recibo/${p.id}`}
                      target="_blank"
                      className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Ver / imprimir
                    </Link>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                    {periodo || texto
                      ? "No hay recibos que coincidan con el filtro."
                      : "Todavía no hay pagos registrados en esta sede."}
                  </td>
                </tr>
              )}
            </tbody>
            {filas.length > 0 && (
              <tfoot>
                <tr className="border-t border-edge bg-panel-deep">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {filas.length} recibo{filas.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                    {formatearMonto(totalCobrado)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  );
}
