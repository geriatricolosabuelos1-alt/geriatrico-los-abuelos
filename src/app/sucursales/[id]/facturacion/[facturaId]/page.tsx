import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HojaFacturaC, formatearFechaFactura } from "@/components/HojaFacturaC";
import { clienteArca } from "@/lib/arca/cliente";
import { qrFacturaArca } from "@/lib/arca/qr";
import {
  CONDICION_IVA_RECEPTOR,
  ETIQUETA_CONDICION_VENTA,
  ETIQUETA_MEDIO_PAGO,
  documentoReceptor,
  numeroFacturaC,
  type FacturaExterna,
} from "@/lib/facturacion";

type Params = { id: string; facturaId: string };

// Factura C de un servicio externo, emitida con el CUIT de la sede.
export default async function FacturaExternaPage({ params }: { params: Promise<Params> }) {
  const { id, facturaId } = await params;
  const supabase = await createClient();

  const { data: factura } = await supabase
    .from("facturas_externas")
    .select("*")
    .eq("id", facturaId)
    .eq("sucursal_id", id)
    .maybeSingle<FacturaExterna>();
  if (!factura) notFound();

  const [{ data: sucursal }, { data: config }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("nombre, direccion")
      .eq("id", id)
      .single<{ nombre: string; direccion: string | null }>(),
    // Solo datos públicos del emisor (CUIT y razón social), sin certificado ni clave.
    clienteArca().then((arca) =>
      arca
        .from("arca_config")
        .select("cuit, razon_social")
        .eq("sucursal_id", id)
        .single<{ cuit: string; razon_social: string }>(),
    ),
  ]);
  if (!config) notFound();

  const qrDataUri = await qrFacturaArca({
    fecha: factura.fecha_emision,
    cuit: config.cuit,
    ptoVta: factura.pto_vta,
    tipoCmp: factura.tipo_cbte,
    nroCmp: factura.cbte_nro,
    importe: factura.importe,
    tipoDocRec: factura.doc_tipo,
    nroDocRec: factura.doc_nro,
    cae: factura.cae,
  });

  return (
    <HojaFacturaC
      volver={
        <Link
          href={`/sucursales/${id}/facturacion`}
          className="text-sm text-brass underline underline-offset-2 hover:text-ink"
        >
          ← Volver a Facturación
        </Link>
      }
      f={{
        sedeNombre: sucursal?.nombre ?? "",
        razonSocial: config.razon_social,
        cuit: config.cuit,
        direccion: sucursal?.direccion ?? null,
        numero: numeroFacturaC(factura.pto_vta, factura.cbte_nro),
        fechaEmision: factura.fecha_emision,
        clienteNombre: factura.receptor_nombre,
        clienteDocumento: documentoReceptor(factura.doc_tipo, factura.doc_nro),
        clienteCondicionIva: CONDICION_IVA_RECEPTOR[factura.condicion_iva_receptor_id] ?? "Consumidor Final",
        concepto: "Servicios",
        textoPeriodo: `Período del ${formatearFechaFactura(factura.periodo_desde)} al ${formatearFechaFactura(factura.periodo_hasta)}`,
        condicionVenta: factura.condicion_venta
          ? (ETIQUETA_CONDICION_VENTA[factura.condicion_venta] ?? factura.condicion_venta)
          : null,
        medioPago: factura.medio_pago ? (ETIQUETA_MEDIO_PAGO[factura.medio_pago] ?? factura.medio_pago) : null,
        lineas: factura.detalle,
        importe: Number(factura.importe),
        cae: factura.cae,
        caeVencimiento: factura.cae_vencimiento,
        qrDataUri,
      }}
    />
  );
}
