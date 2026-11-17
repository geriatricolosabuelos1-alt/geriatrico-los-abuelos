import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { GastosFijos } from "@/components/GastosFijos";
import { GastosVariables } from "@/components/GastosVariables";
import type { Gasto, GastoFijoCatalogo, Perfil } from "@/lib/types";
import { mesAnioArgentina } from "@/lib/fechas";
import { formatearMonto } from "@/lib/finanzas";
import Link from "next/link";

type Params = { id: string };
type SearchParams = { mes?: string; anio?: string };

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default async function GastosSucursalPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ahora = mesAnioArgentina();
  const mes = Number(sp.mes) || ahora.mes;
  const anio = Number(sp.anio) || ahora.anio;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: catalogo }, { data: gastosDelMes }, { data: recibos }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("id", user!.id)
        .single<Perfil>(),
      supabase.from("sucursales").select("id, nombre").eq("id", id).single<{
        id: string;
        nombre: string;
      }>(),
      supabase
        .from("gastos_fijos_catalogo")
        .select("id, nombre, monto_estimado, activo")
        .eq("activo", true)
        .order("nombre")
        .returns<GastoFijoCatalogo[]>(),
      supabase
        .from("gastos")
        .select("id, sucursal_id, categoria, monto, mes, anio, descripcion, tipo, fecha, gasto_fijo_id")
        .eq("sucursal_id", id)
        .eq("mes", mes)
        .eq("anio", anio)
        .order("fecha", { ascending: false })
        .returns<Gasto[]>(),
      // Recibos de sueldo del período (solo para ver: se cargan desde Empleados).
      supabase
        .from("recibos_sueldo")
        .select("id, empleado_id, fecha_pago, total_haberes, neto, empleados!inner(nombre_completo, sucursal_id)")
        .eq("empleados.sucursal_id", id)
        .eq("periodo", `${anio}-${String(mes).padStart(2, "0")}`)
        .returns<
          {
            id: string;
            empleado_id: string;
            fecha_pago: string | null;
            total_haberes: number;
            neto: number;
            empleados: { nombre_completo: string };
          }[]
        >(),
    ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const fijos = (gastosDelMes ?? []).filter((g) => g.tipo === "fijo");
  const listaRecibos = (recibos ?? []).sort((a, b) =>
    a.empleados.nombre_completo.localeCompare(b.empleados.nombre_completo, "es"),
  );
  const variables = (gastosDelMes ?? []).filter((g) => g.tipo === "variable");

  const opcionesAnio = [anio - 1, anio, anio + 1];
  const totalFijos = fijos.reduce((acc, g) => acc + Number(g.monto), 0);
  const totalVariables = variables.reduce((acc, g) => acc + Number(g.monto), 0);
  const totalSueldos = listaRecibos.reduce((acc, r) => acc + Number(r.total_haberes), 0);
  const totalMes = totalFijos + totalVariables + totalSueldos;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "gastos" }}
      />

      <main className="flex-1 space-y-8 px-9 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {sucursal!.nombre}
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Gastos</h1>
          </div>

          <form className="flex gap-2">
            <select
              name="mes"
              defaultValue={mes}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {NOMBRES_MES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
            <select
              name="anio"
              defaultValue={anio}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {opcionesAnio.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Ver
            </button>
          </form>
        </div>

        <section className="rounded-2xl border border-brass/40 bg-brass-soft p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
                Total del mes · {NOMBRES_MES[mes - 1]} {anio}
              </p>
              <p className="font-display text-4xl font-semibold text-brass">{formatearMonto(totalMes)}</p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-sm">
              {(
                [
                  ["Gastos fijos", totalFijos],
                  ["Gastos variables", totalVariables],
                  ["Sueldos", totalSueldos],
                ] as const
              ).map(([etiqueta, monto]) => (
                <div key={etiqueta}>
                  <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">{etiqueta}</dt>
                  <dd className="font-semibold text-ink">{formatearMonto(monto)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <GastosFijos
          sucursalId={id}
          mes={mes}
          anio={anio}
          catalogo={catalogo ?? []}
          gastosDelMes={fijos.map((g) => ({
            id: g.id,
            categoria: g.categoria,
            monto: g.monto,
            gasto_fijo_id: g.gasto_fijo_id,
          }))}
        />

        <GastosVariables sucursalId={id} gastos={variables} />

        <section className="space-y-3 rounded-2xl border border-edge bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Sueldos del mes</h2>
              <p className="text-xs text-ink-soft">
                Recibos de sueldo emitidos para {NOMBRES_MES[mes - 1].toLowerCase()} {anio}. Se cargan desde Empleados.
              </p>
            </div>
            <p className="text-sm text-ink-soft">
              Total:{" "}
              <span className="font-display text-lg font-semibold text-ink">
                {formatearMonto(totalSueldos)}
              </span>
            </p>
          </div>
          {listaRecibos.length === 0 ? (
            <p className="text-sm text-ink-soft">Todavía no hay recibos de sueldo de este mes.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-3">Empleado/a</th>
                  <th className="py-2 pr-3">Fecha de pago</th>
                  <th className="py-2 pr-3 text-right">Sueldo (haberes)</th>
                  <th className="py-2 pr-3 text-right">Neto cobrado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {listaRecibos.map((r) => (
                  <tr key={r.id} className="border-b border-edge/60">
                    <td className="py-2 pr-3 text-ink">{r.empleados.nombre_completo}</td>
                    <td className="py-2 pr-3 text-ink-soft">
                      {r.fecha_pago ? r.fecha_pago.split("-").reverse().join("/") : "—"}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium text-ink">{formatearMonto(Number(r.total_haberes))}</td>
                    <td className="py-2 pr-3 text-right text-ink-soft">{formatearMonto(Number(r.neto))}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/empleados/${r.empleado_id}/recibo?periodo=${anio}-${String(mes).padStart(2, "0")}`}
                        className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                      >
                        Ver recibo
                      </Link>
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
