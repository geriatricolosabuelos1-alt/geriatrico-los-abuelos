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

type Params = { id: string; pagoId: string };

type Pago = {
  id: string;
  mes: number;
  anio: number;
};

type Factura = {
  id: string;
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
};

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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
          "id, tipo_cbte, pto_vta, cbte_nro, cae, cae_vencimiento, importe, fecha_emision, doc_tipo, doc_nro, condicion_venta, medio_pago, condicion_iva_receptor_id, detalle, periodo_desde, periodo_hasta",
        )
        .eq("pago_id", pagoId)
        .single<Factura>(),
      // Solo datos públicos del emisor (CUIT y razón social), sin certificado ni clave.
      clienteArca().then((arca) =>
        arca
          .from("arca_config")
          .select("cuit, razon_social")
          .eq("sucursal_id", residente.sucursal_id)
          .single<{ cuit: string; razon_social: string }>(),
      ),
    ]);

  if (!pago || !factura || !config) {
    notFound();
  }

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

  const nombreMes = MESES[pago.mes].charAt(0).toUpperCase() + MESES[pago.mes].slice(1);
  const lineasDetalle =
    factura.detalle && factura.detalle.length > 0
      ? factura.detalle
      : [
          {
            descripcion: `Servicios de cuidado geriátrico — ${nombreMes} ${pago.anio}`,
            importe: factura.importe,
          },
        ];
  const textoPeriodo =
    factura.periodo_desde && factura.periodo_hasta
      ? `Período del ${formatearFechaFactura(factura.periodo_desde)} al ${formatearFechaFactura(factura.periodo_hasta)}`
      : `Período ${MESES[pago.mes]} de ${pago.anio}`;

  return (
    <HojaFacturaC
      envio={{ tipo: "residente", facturaId: factura.id }}
      f={{
        sedeNombre: sucursal?.nombre ?? "",
        razonSocial: config.razon_social,
        cuit: config.cuit,
        direccion: sucursal?.direccion ?? null,
        numero: numeroFacturaC(factura.pto_vta, factura.cbte_nro),
        fechaEmision: factura.fecha_emision,
        clienteNombre: `${residente.apellido}, ${residente.nombre}`,
        clienteDocumento: documentoReceptor(factura.doc_tipo, factura.doc_nro),
        clienteCondicionIva: CONDICION_IVA_RECEPTOR[factura.condicion_iva_receptor_id ?? 5] ?? "Consumidor Final",
        concepto: "Servicios de residencia geriátrica",
        textoPeriodo,
        condicionVenta: factura.condicion_venta
          ? (ETIQUETA_CONDICION_VENTA[factura.condicion_venta] ?? factura.condicion_venta)
          : null,
        medioPago: factura.medio_pago ? (ETIQUETA_MEDIO_PAGO[factura.medio_pago] ?? factura.medio_pago) : null,
        lineas: lineasDetalle,
        importe: factura.importe,
        cae: factura.cae,
        caeVencimiento: factura.cae_vencimiento,
        qrDataUri,
      }}
    />
  );
}
