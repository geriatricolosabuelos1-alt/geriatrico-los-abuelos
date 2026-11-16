import Link from "next/link";
import { notFound } from "next/navigation";
import { HojaFacturaC } from "@/components/HojaFacturaC";
import { datosFactura } from "@/lib/facturaDatos";

type Params = { id: string; facturaId: string };

// Factura C de un servicio externo, emitida con el CUIT de la sede.
export default async function FacturaExternaPage({ params }: { params: Promise<Params> }) {
  const { id, facturaId } = await params;
  const factura = await datosFactura("externa", facturaId);
  if (!factura || factura.sucursalId !== id) notFound();

  return (
    <HojaFacturaC
      f={factura.datos}
      envio={{ tipo: "externa", facturaId }}
      volver={
        <Link
          href={`/sucursales/${id}/facturacion?mes=${factura.datos.fechaEmision.slice(0, 7)}`}
          className="text-sm text-brass underline underline-offset-2 hover:text-ink"
        >
          ← Volver a Facturación
        </Link>
      }
    />
  );
}
