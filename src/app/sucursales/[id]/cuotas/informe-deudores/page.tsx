import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularResumenCuenta, type PagoResumen } from "@/lib/aranceles";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";

type Params = { id: string };

type FilaResidenteArancel = {
  id: string;
  nombre: string;
  apellido: string;
  ficha_administrativa: {
    obra_social: string | null;
    porcentaje_recargo_mora: number | null;
    fecha_vencimiento_cuota: string | null;
  } | null;
};

const MESES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatearMonto(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}

export default async function InformeDeudoresPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal) {
    notFound();
  }

  const { data: residentes } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, ficha_administrativa(obra_social, porcentaje_recargo_mora, fecha_vencimiento_cuota)",
    )
    .eq("sucursal_id", id)
    .eq("activo", true)
    .order("apellido")
    .returns<FilaResidenteArancel[]>();

  const { data: pagos } = await supabase
    .from("pagos")
    .select("residente_id, monto, monto_pagado, mes, anio, estado, fecha_pago")
    .eq("sucursal_id", id)
    .returns<(PagoResumen & { residente_id: string })[]>();

  const deudores = (residentes ?? [])
    .map((r) => {
      const pagosDelResidente = (pagos ?? []).filter((p) => p.residente_id === r.id);
      const diaVencimiento = r.ficha_administrativa?.fecha_vencimiento_cuota
        ? new Date(r.ficha_administrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
        : 10;
      const resumen = calcularResumenCuenta(
        pagosDelResidente,
        diaVencimiento,
        r.ficha_administrativa?.porcentaje_recargo_mora ?? 0,
      );

      return {
        id: r.id,
        nombre: r.nombre,
        apellido: r.apellido,
        obraSocial: r.ficha_administrativa?.obra_social ?? null,
        resumen,
      };
    })
    .filter((r) => r.resumen.cantidadPendientes > 0)
    .sort((a, b) => b.resumen.totalAdeudado - a.resumen.totalAdeudado);

  const totalAdeudado = deudores.reduce((acc, d) => acc + d.resumen.totalAdeudado, 0);
  const totalMora = deudores.reduce((acc, d) => acc + d.resumen.totalMora, 0);

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="w-full max-w-[860px] overflow-hidden rounded-2xl border border-edge bg-card p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-ink print:text-black">Los Abuelos</p>
            <p className="text-xs uppercase tracking-widest text-ink-soft print:text-neutral-600">
              Informe de deudores · {sucursal.nombre}
            </p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
              Generado el {new Date().toLocaleDateString("es-AR")}
            </p>
          </div>
          <div className="print:hidden">
            <BotonExportarPdf />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
              <th className="py-2 pr-3">Residente</th>
              <th className="py-2 pr-3">Obra social</th>
              <th className="py-2 pr-3">Último pagado</th>
              <th className="py-2 pr-3 text-right">Pendientes</th>
              <th className="py-2 pr-3 text-right">Adeudado</th>
              <th className="py-2 text-right">Mora</th>
            </tr>
          </thead>
          <tbody>
            {deudores.map((d) => (
              <tr
                key={d.id}
                className="border-b border-edge print:border-neutral-300"
              >
                <td className="py-2.5 pr-3 font-medium text-ink print:text-black">
                  {d.apellido}, {d.nombre}
                </td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">
                  {d.obraSocial ?? "—"}
                </td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">
                  {d.resumen.ultimoPeriodoPagado
                    ? `${MESES[d.resumen.ultimoPeriodoPagado.mes]} ${d.resumen.ultimoPeriodoPagado.anio}`
                    : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right text-ink print:text-black">
                  {d.resumen.cantidadPendientes}
                </td>
                <td className="py-2.5 pr-3 text-right font-medium text-ink print:text-black">
                  {formatearMonto(d.resumen.totalAdeudado)}
                </td>
                <td className="py-2.5 text-right text-ink-soft print:text-neutral-700">
                  {d.resumen.totalMora > 0 ? formatearMonto(d.resumen.totalMora) : "—"}
                </td>
              </tr>
            ))}
            {deudores.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-soft print:text-neutral-600">
                  No hay residentes con saldo pendiente.
                </td>
              </tr>
            )}
          </tbody>
          {deudores.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-brass/30 font-semibold print:border-black">
                <td className="py-3 pr-3 text-ink print:text-black" colSpan={4}>
                  Total
                </td>
                <td className="py-3 pr-3 text-right text-brass print:text-black">
                  {formatearMonto(totalAdeudado)}
                </td>
                <td className="py-3 text-right text-brass print:text-black">
                  {totalMora > 0 ? formatearMonto(totalMora) : "—"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
