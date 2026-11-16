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
} from "@/lib/facturacion";

type Params = { id: string; facturaId: string };

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
  condicion_venta: string | null;
  medio_pago: string | null;
  condicion_iva_receptor_id: number | null;
  detalle: { descripcion: string; importe: number }[] | null;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  residentes: { nombre: string; apellido: string } | null;
};

// Factura de arancel de un residente, abierta desde el registro de Facturación
// (sigue disponible aunque el pago se haya borrado).
export default async function FacturaResidenteRegistroPage({ params }: { params: Promise<Params> }) {
  const { id, facturaId } = await params;
  const supabase = await createClient();

  const { data: factura } = await supabase
    .from("facturas_arca")
    .select(
      "tipo_cbte, pto_vta, cbte_nro, cae, cae_vencimiento, importe, fecha_emision, doc_tipo, doc_nro, condicion_venta, medio_pago, condicion_iva_receptor_id, detalle, periodo_desde, periodo_hasta, residentes(nombre, apellido)",
    )
    .eq("id", facturaId)
    .eq("sucursal_id", id)
    .maybeSingle<Factura>();
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

  const lineas =
    factura.detalle && factura.detalle.length > 0
      ? factura.detalle
      : [{ descripcion: "Servicios de cuidado geriátrico", importe: factura.importe }];

  return (
    <HojaFacturaC
      volver={
        <Link
          href={`/sucursales/${id}/facturacion?mes=${factura.fecha_emision.slice(0, 7)}`}
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
        clienteNombre: factura.residentes
          ? `${factura.residentes.apellido}, ${factura.residentes.nombre}`
          : "Residente",
        clienteDocumento: documentoReceptor(factura.doc_tipo, factura.doc_nro),
        clienteCondicionIva: CONDICION_IVA_RECEPTOR[factura.condicion_iva_receptor_id ?? 5] ?? "Consumidor Final",
        concepto: "Servicios de residencia geriátrica",
        textoPeriodo:
          factura.periodo_desde && factura.periodo_hasta
            ? `Período del ${formatearFechaFactura(factura.periodo_desde)} al ${formatearFechaFactura(factura.periodo_hasta)}`
            : "",
        condicionVenta: factura.condicion_venta
          ? (ETIQUETA_CONDICION_VENTA[factura.condicion_venta] ?? factura.condicion_venta)
          : null,
        medioPago: factura.medio_pago ? (ETIQUETA_MEDIO_PAGO[factura.medio_pago] ?? factura.medio_pago) : null,
        lineas,
        importe: Number(factura.importe),
        cae: factura.cae,
        caeVencimiento: factura.cae_vencimiento,
        qrDataUri,
      }}
    />
  );
}
