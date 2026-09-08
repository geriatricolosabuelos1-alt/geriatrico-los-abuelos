import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";

type Params = { id: string; pagoId: string };

type Pago = {
  id: string;
  monto: number;
  monto_pagado: number;
  mes: number;
  anio: number;
  estado: "pendiente" | "parcial" | "pagado";
  fecha_pago: string | null;
  tipo_pago: "obra_social" | "paciente";
};

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const ETIQUETA_TIPO_PAGO: Record<Pago["tipo_pago"], string> = {
  obra_social: "Obra social",
  paciente: "Paciente / familia",
};

function formatearImporte(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export default async function ReciboPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, pagoId } = await params;
  const supabase = await createClient();

  const { data: residente } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, dni, sucursal_id")
    .eq("id", id)
    .single<{
      id: string;
      nombre: string;
      apellido: string;
      dni: string | null;
      sucursal_id: string;
    }>();

  if (!residente) {
    notFound();
  }

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion")
    .eq("id", residente.sucursal_id)
    .single<{ id: string; nombre: string; direccion: string | null }>();

  const { data: pago } = await supabase
    .from("pagos")
    .select("id, monto, monto_pagado, mes, anio, estado, fecha_pago, tipo_pago")
    .eq("id", pagoId)
    .eq("residente_id", id)
    .single<Pago>();

  if (!pago) {
    notFound();
  }

  const importe = pago.monto_pagado > 0 ? pago.monto_pagado : pago.monto;
  const ahora = new Date();
  const numeroRecibo = `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, "0")}${String(ahora.getDate()).padStart(2, "0")}-${pago.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; }`}</style>

      <div className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-edge bg-card shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none print:text-black">
        <div className="flex items-start justify-between bg-gradient-to-r from-brass/20 via-brass/5 to-transparent px-8 py-6 print:bg-white print:px-0 print:pb-4">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink print:text-black">
              Los Abuelos
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-widest text-ink-soft print:text-neutral-600">
              Suite de cuidado
            </p>
            <p className="mt-2 text-xs text-ink-soft print:text-neutral-600">
              {sucursal?.nombre}
              {sucursal?.direccion ? ` · ${sucursal.direccion}` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-brass/40 bg-panel-deep px-4 py-3 text-right print:border-black print:bg-white">
            <p className="text-xs font-bold uppercase tracking-widest text-brass print:text-black">
              Recibo
            </p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">Nº {numeroRecibo}</p>
            <p className="text-xs text-ink-soft print:text-neutral-600">
              {ahora.toLocaleDateString("es-AR")} · {ahora.toLocaleTimeString("es-AR")}
            </p>
          </div>
        </div>

        <div className="space-y-6 px-8 py-6 print:px-0">
          <div className="grid grid-cols-2 gap-6 border-b border-edge pb-6 print:border-neutral-300">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                Recibí de
              </p>
              <p className="mt-1 text-base font-semibold text-ink print:text-black">
                {residente.apellido}, {residente.nombre}
              </p>
              {residente.dni && (
                <p className="text-xs text-ink-soft print:text-neutral-600">
                  DNI {residente.dni}
                </p>
              )}
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                En concepto de
              </p>
              <p className="mt-1 text-base font-semibold text-ink print:text-black">
                Arancel de {MESES[pago.mes]} de {pago.anio}
              </p>
              <p className="text-xs text-ink-soft print:text-neutral-600">
                {ETIQUETA_TIPO_PAGO[pago.tipo_pago]}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
                <th className="pb-2">Período</th>
                <th className="pb-2">Detalle</th>
                <th className="pb-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 font-medium text-ink print:text-black">
                  {MESES[pago.mes].charAt(0).toUpperCase() + MESES[pago.mes].slice(1)}{" "}
                  {pago.anio}
                </td>
                <td className="py-3 text-ink-soft print:text-neutral-600">
                  {ETIQUETA_TIPO_PAGO[pago.tipo_pago]}
                </td>
                <td className="py-3 text-right font-medium text-ink print:text-black">
                  {formatearImporte(importe)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center justify-between rounded-xl border border-brass/30 bg-brass-soft px-6 py-4 print:rounded-none print:border-2 print:border-black print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink print:text-black">
              Total recibido
            </p>
            <p className="font-display text-3xl font-semibold text-brass print:text-black">
              {formatearImporte(importe)}
            </p>
          </div>

          <div className="flex items-end justify-between gap-8 pt-10">
            <p className="max-w-[16rem] text-[0.65rem] leading-relaxed text-ink-soft print:text-neutral-500">
              Este comprobante no reemplaza a la factura o recibo oficial de ARCA.
            </p>
            <div className="text-center">
              <div className="mb-1 w-56 border-t border-edge print:border-black" />
              <p className="text-xs text-ink-soft print:text-neutral-600">Firma y aclaración</p>
            </div>
          </div>
        </div>

        <div className="border-t border-edge px-8 py-4 print:hidden">
          <BotonImprimir />
        </div>
      </div>
    </div>
  );
}
