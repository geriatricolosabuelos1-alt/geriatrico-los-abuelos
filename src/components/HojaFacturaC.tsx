import { BotonImprimir } from "@/components/BotonImprimir";
import { BotonWhatsappFactura } from "@/components/BotonWhatsappFactura";
import { BotonMailFactura } from "@/components/BotonMailFactura";
import type { TipoFactura } from "@/lib/facturaDatos";

export type DatosHojaFacturaC = {
  sedeNombre: string;
  razonSocial: string;
  cuit: string;
  direccion: string | null;
  numero: string;
  fechaEmision: string;
  clienteNombre: string;
  clienteDocumento: string;
  clienteCondicionIva: string;
  concepto: string;
  textoPeriodo: string;
  condicionVenta: string | null;
  medioPago: string | null;
  lineas: { descripcion: string; importe: number }[];
  importe: number;
  cae: string;
  caeVencimiento: string;
  qrDataUri: string;
};

function formatearImporte(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function formatearFechaFactura(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");
}

// Factura C electrónica lista para imprimir (residentes y servicios externos).
export function HojaFacturaC({
  f,
  volver,
  envio,
}: {
  f: DatosHojaFacturaC;
  volver?: React.ReactNode;
  envio?: { tipo: TipoFactura; facturaId: string };
}) {
  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 16mm; }`}</style>

      <div className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-edge bg-card shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none print:text-black">
        <div className="flex items-start justify-between border-b-4 border-double border-ink/60 px-8 py-6 print:border-black print:px-0 print:pb-4">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink print:text-black">
              {f.sedeNombre}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft print:text-neutral-600">{f.razonSocial}</p>
            <p className="text-xs text-ink-soft print:text-neutral-600">
              CUIT {f.cuit.slice(0, 2)}-{f.cuit.slice(2, 10)}-{f.cuit.slice(10)}
            </p>
            <p className="text-xs text-ink-soft print:text-neutral-600">{f.direccion}</p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">Monotributista</p>
          </div>
          <div className="rounded-xl border-2 border-ink/60 px-5 py-3 text-center print:border-black">
            <p className="font-display text-2xl font-bold text-ink print:text-black">C</p>
            <p className="text-[0.6rem] text-ink-soft print:text-neutral-600">COD. 011</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-widest text-ink print:text-black">Factura</p>
            <p className="mt-1 text-sm text-ink print:text-black">Nº {f.numero}</p>
            <p className="text-xs text-ink-soft print:text-neutral-600">
              Fecha de emisión: {formatearFechaFactura(f.fechaEmision)}
            </p>
          </div>
        </div>

        <div className="space-y-6 px-8 py-6 print:px-0">
          <div className="grid grid-cols-2 gap-6 border-b border-edge pb-6 print:border-neutral-300">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                Cliente
              </p>
              <p className="mt-1 text-base font-semibold text-ink print:text-black">{f.clienteNombre}</p>
              <p className="text-xs text-ink-soft print:text-neutral-600">{f.clienteDocumento}</p>
              <p className="text-xs text-ink-soft print:text-neutral-600">
                Condición frente al IVA: {f.clienteCondicionIva}
              </p>
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                En concepto de
              </p>
              <p className="mt-1 text-base font-semibold text-ink print:text-black">{f.concepto}</p>
              <p className="text-xs text-ink-soft print:text-neutral-600">{f.textoPeriodo}</p>
              {f.condicionVenta && (
                <p className="text-xs text-ink-soft print:text-neutral-600">
                  Condición de venta: {f.condicionVenta}
                  {f.medioPago && ` – ${f.medioPago}`}
                </p>
              )}
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
              {f.lineas.map((linea, indice) => (
                <tr key={indice}>
                  <td className="whitespace-pre-line py-3 text-ink print:text-black">{linea.descripcion}</td>
                  <td className="py-3 pl-4 text-right align-top font-medium whitespace-nowrap text-ink print:text-black">
                    {formatearImporte(linea.importe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between rounded-xl border border-brass/30 bg-brass-soft px-6 py-4 print:rounded-none print:border-2 print:border-black print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink print:text-black">Importe total</p>
            <p className="font-display text-3xl font-semibold text-brass print:text-black">
              {formatearImporte(f.importe)}
            </p>
          </div>

          <div className="flex items-end justify-between gap-8 border-t border-edge pt-6 print:border-neutral-300">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.qrDataUri} alt="Código QR de ARCA" width={110} height={110} />
              <div>
                <p className="text-xs text-ink-soft print:text-neutral-600">
                  CAE: <span className="font-medium text-ink print:text-black">{f.cae}</span>
                </p>
                <p className="text-xs text-ink-soft print:text-neutral-600">
                  Vto. CAE: {formatearFechaFactura(f.caeVencimiento)}
                </p>
                <p className="mt-1 max-w-[14rem] text-[0.6rem] leading-relaxed text-ink-soft print:text-neutral-500">
                  Comprobante Autorizado por AFIP/ARCA
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-edge px-8 py-4 print:hidden">
          {volver}
          <div className="flex items-start gap-3">
            {envio && <BotonMailFactura tipo={envio.tipo} facturaId={envio.facturaId} />}
            <BotonWhatsappFactura f={f} />
            <BotonImprimir />
          </div>
        </div>
      </div>
    </div>
  );
}
