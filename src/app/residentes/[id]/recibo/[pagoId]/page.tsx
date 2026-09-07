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

function numeroALetras(monto: number): string {
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
    <div className="flex min-h-screen w-full items-start justify-center bg-panel px-4 py-10 print:block print:bg-white print:px-0 print:py-0">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-edge bg-card p-8 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <div className="flex items-start justify-between border-b border-edge pb-4 print:border-black">
          <div>
            <p className="font-display text-lg font-bold text-ink print:text-black">
              Los Abuelos
            </p>
            <p className="text-xs text-ink-soft print:text-black">
              {sucursal?.nombre}
              {sucursal?.direccion ? ` · ${sucursal.direccion}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-brass print:text-black">
              Recibo
            </p>
            <p className="text-xs text-ink-soft print:text-black">Nº {numeroRecibo}</p>
            <p className="text-xs text-ink-soft print:text-black">
              Emitido: {ahora.toLocaleDateString("es-AR")} {ahora.toLocaleTimeString("es-AR")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-black">
              Recibí de
            </p>
            <p className="text-sm font-medium text-ink print:text-black">
              {residente.apellido}, {residente.nombre}
            </p>
            {residente.dni && (
              <p className="text-xs text-ink-soft print:text-black">DNI {residente.dni}</p>
            )}
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-black">
              Concepto
            </p>
            <p className="text-sm font-medium text-ink print:text-black">
              Arancel de {MESES[pago.mes]} de {pago.anio}
            </p>
            <p className="text-xs text-ink-soft print:text-black">
              {ETIQUETA_TIPO_PAGO[pago.tipo_pago]}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel-deep p-5 text-center print:border-black print:bg-white">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-black">
            Importe recibido
          </p>
          <p className="font-display text-3xl font-bold text-brass print:text-black">
            {numeroALetras(importe)}
          </p>
        </div>

        <div className="pt-8 text-center text-xs text-ink-soft print:text-black">
          <div className="mx-auto mb-1 w-48 border-t border-edge print:border-black" />
          Firma y aclaración
        </div>

        <p className="text-center text-[0.65rem] text-ink-soft print:text-black">
          Este comprobante no reemplaza a la factura o recibo oficial de ARCA.
        </p>

        <div className="print:hidden">
          <BotonImprimir />
        </div>
      </div>
    </div>
  );
}
