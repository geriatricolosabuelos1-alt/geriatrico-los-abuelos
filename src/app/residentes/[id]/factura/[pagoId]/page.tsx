import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HojaFacturaC } from "@/components/HojaFacturaC";
import { datosFactura } from "@/lib/facturaDatos";

type Params = { id: string; pagoId: string };

// Factura C del arancel de un residente (desde su cuenta corriente).
export default async function FacturaPage({ params }: { params: Promise<Params> }) {
  const { id, pagoId } = await params;
  const supabase = await createClient();

  const { data: factura } = await supabase
    .from("facturas_arca")
    .select("id")
    .eq("pago_id", pagoId)
    .eq("residente_id", id)
    .maybeSingle<{ id: string }>();
  if (!factura) notFound();

  const datos = await datosFactura("residente", factura.id);
  if (!datos) notFound();

  return <HojaFacturaC f={datos.datos} envio={{ tipo: "residente", facturaId: factura.id }} />;
}
