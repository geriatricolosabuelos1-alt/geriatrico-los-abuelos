import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { hayAlertaAmarilla, hayAlertaRoja, obtenerResumenSucursal } from "@/lib/dashboard";
import { formatearMonto, obtenerResumenFinanciero } from "@/lib/finanzas";
import { GraficoIngresosGastos, GraficoSueldos } from "@/components/GraficoFinanciero";
import { AvisosSede } from "@/components/AvisosSede";
import { DetalleAlertasSede } from "@/components/DetalleAlertasSede";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

export default async function DashboardSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, resumen, finanzas] = await Promise.all([
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
    obtenerResumenSucursal(supabase, id),
    obtenerResumenFinanciero(supabase, id),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const medicacionRoja = hayAlertaRoja(resumen.alertasMedicacion);
  const medicacionAmarilla = hayAlertaAmarilla(resumen.alertasMedicacion);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "dashboard" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal!.nombre}
          </p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Dashboard</h1>
        </div>

        <AvisosSede sucursalId={id} />

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <Link
            href={`/sucursales/${id}/residentes`}
            className="rounded-2xl border border-edge bg-card p-5 transition-colors hover:border-brass"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Residentes activos
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums lining-nums text-ink">
              {resumen.residentesActivos}
            </p>
          </Link>
          <Link
            href={`/sucursales/${id}/cuotas/informe-deudores`}
            target="_blank"
            className="relative overflow-hidden rounded-2xl border border-transparent bg-warn p-5 transition-colors hover:border-brass"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Monto pendiente de cobro
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums lining-nums text-ink">
              {formatearMonto(resumen.montoPendiente)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {resumen.cantidadPendientes} cuota{resumen.cantidadPendientes === 1 ? "" : "s"}
              {resumen.cantidadVencidas > 0 ? `, ${resumen.cantidadVencidas} residente(s) con atraso` : ""}
              {" · ver informe"}
            </p>
          </Link>
          <Link
            href={`/sucursales/${id}/medicacion/informe`}
            target="_blank"
            className={`rounded-2xl border p-5 transition-colors hover:border-brass ${
              medicacionRoja
                ? "alerta-pulso border-red-300 bg-red-50"
                : medicacionAmarilla
                  ? "border-amber-300 bg-amber-50"
                  : "border-edge bg-card"
            }`}
          >
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {(medicacionRoja || medicacionAmarilla) && (
                <span
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${
                    medicacionRoja ? "alerta-punto bg-red-600" : "bg-amber-500"
                  }`}
                />
              )}
              Alertas de medicación
            </p>
            <p
              className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                medicacionRoja ? "text-red-700" : medicacionAmarilla ? "text-amber-700" : "text-ink"
              }`}
            >
              {resumen.alertasMedicacion.length}
            </p>
          </Link>
          <Link
            href={`/sucursales/${id}/inventario/informe-stock`}
            target="_blank"
            className={`rounded-2xl border p-5 transition-colors hover:border-brass ${
              resumen.alertasInsumos.length > 0
                ? "alerta-pulso border-red-300 bg-red-50"
                : "border-edge bg-card"
            }`}
          >
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {resumen.alertasInsumos.length > 0 && (
                <span className="alerta-punto h-2 w-2 flex-shrink-0 rounded-full bg-red-600" />
              )}
              Alertas de insumos
            </p>
            <p
              className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                resumen.alertasInsumos.length > 0 ? "text-red-700" : "text-ink"
              }`}
            >
              {resumen.alertasInsumos.length}
            </p>
          </Link>
        </div>

        <DetalleAlertasSede sucursalId={id} resumen={resumen} />

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-edge bg-card p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Disponible (ingresos − gastos)
              </p>
              <p
                className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                  finanzas.disponibleSinSueldos < 0 ? "text-red-700" : "text-ink"
                }`}
              >
                {formatearMonto(finanzas.disponibleSinSueldos)}
              </p>
            </div>
            <div className="rounded-2xl border border-edge bg-card p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Disponible (ingresos − gastos − sueldos)
              </p>
              <p
                className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                  finanzas.disponibleConSueldos < 0 ? "text-red-700" : "text-ink"
                }`}
              >
                {formatearMonto(finanzas.disponibleConSueldos)}
              </p>
            </div>
          </div>

          <GraficoIngresosGastos
            ingresosPorMes={finanzas.ingresosPorMes}
            gastosPorMes={finanzas.gastosPorMes}
          />

          <GraficoSueldos sueldosPorMes={finanzas.sueldosPorMes} />
        </div>
      </main>
    </div>
  );
}
