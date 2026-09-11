import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";

type Params = { id: string; pagoId: string };

type Pago = {
  id: string;
  mes: number;
  anio: number;
};

type Factura = {
  tipo_cbte: number;
  pto_vta: number;
  cbte_nro: number;
  cae: string;
  cae_vencimiento: string;
  importe: number;
  fecha_emision: string;
  doc_tipo: number;
  doc_nro: string;
};

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatearImporte(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-AR");
}

export default async function FacturaPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, pagoId } = await params;
  const supabase = await createClient();

  const { data: residente } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, sucursal_id")
    .eq("id", id)
    .single<{ id: string; nombre: string; apellido: string; sucursal_id: string }>();

  if (!residente) {
    notFound();
  }

  const [{ data: sucursal }, { data: pago }, { data: factura }, { data: config }] =
    await Promise.all([
      supabase
        .from("sucursales")
        .select("id, nombre, direccion")
        .eq("id", residente.sucursal_id)
        .single<{ id: string; nombre: string; direccion: string | null }>(),
      supabase
        .from("pagos")
        .select("id, mes, anio")
        .eq("id", pagoId)
        .eq("residente_id", id)
        .single<Pago>(),
      supabase
        .from("facturas_arca")
        .select(
          "tipo_cbte, pto_vta, cbte_nro, cae, cae_vencimiento, importe, fecha_emision, doc_tipo, doc_nro",
        )
        .eq("pago_id", pagoId)
        .single<Factura>(),
      supabase
        .from("arca_config")
        .select("cuit, razon_social")
        .eq("sucursal_id", residente.sucursal_id)
        .single<{ cuit: string; razon_social: string }>(),
    ]);

  if (!pago || !factura || !config) {
    notFound();
  }

  const qrPayload = {
    ver: 1,
    fecha: factura.fecha_emision,
    cuit: Number(config.cuit),
    ptoVta: factura.pto_vta,
    tipoCmp: factura.tipo_cbte,
    nroCmp: factura.cbte_nro,
    importe: factura.importe,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: factura.doc_tipo,
    nroDocRec: Number(factura.doc_nro),
    tipoCodAut: "E",
    codAut: Number(factura.cae),
  };
  const qrUrl =
    "https://www.afip.gob.ar/fe/qr/?p=" +
    Buffer.from(JSON.stringify(qrPayload)).toString("base64");
  const qrDataUri = await QRCode.toDataURL(qrUrl, { margin: 1, width: 160 });

  const numeroFactura = `C ${String(factura.pto_vta).padStart(5, "0")}-${String(factura.cbte_nro).padStart(8, "0")}`;

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; }`}</style>

      <div className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-edge bg-card shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none print:text-black">
        <div className="flex items-start justify-between border-b-4 border-double border-ink/60 px-8 py-6 print:border-black print:px-0 print:pb-4">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink print:text-black">
              {sucursal?.nombre}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft print:text-neutral-600">
              {config.razon_social}
            </p>
            <p className="text-xs text-ink-soft print:text-neutral-600">
              CUIT {config.cuit.slice(0, 2)}-{config.cuit.slice(2, 10)}-{config.cuit.slice(10)}
            </p>
            <p className="text-xs text-ink-soft print:text-neutral-600">
              {sucursal?.direccion}
            </p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
              Monotributista
            </p>
          </div>
          <div className="rounded-xl border-2 border-ink/60 px-5 py-3 text-center print:border-black">
            <p className="font-display text-2xl font-bold text-ink print:text-black">C</p>
            <p className="text-[0.6rem] text-ink-soft print:text-neutral-600">
              COD. 011
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-ink print:text-black">
              Factura
            </p>
            <p className="mt-1 text-sm text-ink print:text-black">Nº {numeroFactura}</p>
            <p className="text-xs text-ink-soft print:text-neutral-600">
              Fecha de emisión: {formatearFecha(factura.fecha_emision)}
            </p>
          </div>
        </div>

        <div className="space-y-6 px-8 py-6 print:px-0">
          <div className="grid grid-cols-2 gap-6 border-b border-edge pb-6 print:border-neutral-300">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                Cliente
              </p>
              <p className="mt-1 text-base font-semibold text-ink print:text-black">
                {residente.apellido}, {residente.nombre}
              </p>
              <p className="text-xs text-ink-soft print:text-neutral-600">
                {factura.doc_tipo === 96
                  ? `DNI ${factura.doc_nro}`
                  : "Consumidor Final"}
              </p>
              <p className="text-xs text-ink-soft print:text-neutral-600">
                Condición frente al IVA: Consumidor Final
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                En concepto de
              </p>
              <p className="mt-1 text-base font-semibold text-ink print:text-black">
                Servicios de residencia geriátrica
              </p>
              <p className="text-xs text-ink-soft print:text-neutral-600">
                Período {MESES[pago.mes]} de {pago.anio}
              </p>
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
                <th className="pb-2">Descripción</th>
                <th className="pb-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 text-ink print:text-black">
                  Servicios de cuidado geriátrico —{" "}
                  {MESES[pago.mes].charAt(0).toUpperCase() + MESES[pago.mes].slice(1)}{" "}
                  {pago.anio}
                </td>
                <td className="py-3 text-right font-medium text-ink print:text-black">
                  {formatearImporte(factura.importe)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-center justify-between rounded-xl border border-brass/30 bg-brass-soft px-6 py-4 print:rounded-none print:border-2 print:border-black print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink print:text-black">
              Importe total
            </p>
            <p className="font-display text-3xl font-semibold text-brass print:text-black">
              {formatearImporte(factura.importe)}
            </p>
          </div>

          <div className="flex items-end justify-between gap-8 border-t border-edge pt-6 print:border-neutral-300">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUri} alt="Código QR de ARCA" width={110} height={110} />
              <div>
                <p className="text-xs text-ink-soft print:text-neutral-600">
                  CAE: <span className="font-medium text-ink print:text-black">{factura.cae}</span>
                </p>
                <p className="text-xs text-ink-soft print:text-neutral-600">
                  Vto. CAE: {formatearFecha(factura.cae_vencimiento)}
                </p>
                <p className="mt-1 max-w-[14rem] text-[0.6rem] leading-relaxed text-ink-soft print:text-neutral-500">
                  Comprobante Autorizado por AFIP/ARCA
                </p>
              </div>
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
