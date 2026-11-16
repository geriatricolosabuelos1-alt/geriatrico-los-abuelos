import Link from "next/link";
import { notFound } from "next/navigation";
import { HojaFacturaC } from "@/components/HojaFacturaC";
import { datosFactura } from "@/lib/facturaDatos";

type Params = { id: string; facturaId: string };

// Factura C de arancel de un residente, abierta desde el registro (sigue disponible aunque se borre el pago).
export default async function FacturaResidenteRegistroPage({ params }: { params: Promise<Params> }) {
  const { id, facturaId } = await params;
  const factura = await datosFactura("residente", facturaId);
  if (!factura || factura.sucursalId !== id) notFound();

  return (
    <HojaFacturaC
      f={factura.datos}
      envio={{ tipo: "residente", facturaId }}
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
