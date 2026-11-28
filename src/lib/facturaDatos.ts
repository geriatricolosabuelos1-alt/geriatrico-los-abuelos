import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clienteArca } from "@/lib/arca/cliente";
import { qrFacturaArca } from "@/lib/arca/qr";
import { formatearFechaFactura, type DatosHojaFacturaC } from "@/components/HojaFacturaC";
import {
  CONDICION_IVA_RECEPTOR,
  ETIQUETA_CONDICION_VENTA,
  ETIQUETA_MEDIO_PAGO,
  documentoReceptor,
  numeroFacturaC,
} from "@/lib/facturacion";

export type TipoFactura = "residente" | "externa";

type FilaFactura = {
  sucursal_id: string;
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
  receptor_nombre?: string | null;
  residentes?: { nombre: string; apellido: string } | null;
};

const COLUMNAS =
  "sucursal_id, tipo_cbte, pto_vta, cbte_nro, cae, cae_vencimiento, importe, fecha_emision, doc_tipo, doc_nro, condicion_venta, medio_pago, condicion_iva_receptor_id, detalle, periodo_desde, periodo_hasta";

// Datos completos de una Factura C (residente o servicio externo) para la hoja, el PDF o el mail.
// Se lee con la sesión del usuario: si no tiene permiso sobre la sede, devuelve null.
export async function datosFactura(
  tipo: TipoFactura,
  facturaId: string,
): Promise<{ sucursalId: string; datos: DatosHojaFacturaC } | null> {
  const supabase = await createClient();
  const { data: factura } = await supabase
    .from(tipo === "externa" ? "facturas_externas" : "facturas_arca")
    .select(tipo === "externa" ? `${COLUMNAS}, receptor_nombre` : `${COLUMNAS}, receptor_nombre, residentes(nombre, apellido)`)
    .eq("id", facturaId)
    .maybeSingle<FilaFactura>();
  if (!factura) return null;

  const [{ data: sucursal }, { data: config }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("nombre, direccion")
      .eq("id", factura.sucursal_id)
      .single<{ nombre: string; direccion: string | null }>(),
    // Solo datos públicos del emisor (CUIT y razón social), sin certificado ni clave.
    clienteArca().then((arca) =>
      arca
        .from("arca_config")
        .select("cuit, razon_social")
        .eq("sucursal_id", factura.sucursal_id)
        .single<{ cuit: string; razon_social: string }>(),
    ),
  ]);
  if (!config) return null;

  const qrDataUri = await qrFacturaArca({
    fecha: factura.fecha_emision,
    cuit: config.cuit,
    ptoVta: factura.pto_vta,
    tipoCmp: factura.tipo_cbte,
    nroCmp: factura.cbte_nro,
    importe: Number(factura.importe),
    tipoDocRec: factura.doc_tipo,
    nroDocRec: factura.doc_nro,
    cae: factura.cae,
  });

  const nombreResidente = factura.residentes
    ? `${factura.residentes.apellido}, ${factura.residentes.nombre}`
    : "Residente";
  // Factura de residente a nombre de un familiar: el cliente es el familiar y el residente va en el concepto.
  const clienteNombre = tipo === "externa" ? (factura.receptor_nombre ?? "") : (factura.receptor_nombre ?? nombreResidente);
  const aNombreDeOtro = tipo === "residente" && !!factura.receptor_nombre && factura.receptor_nombre !== nombreResidente;

  return {
    sucursalId: factura.sucursal_id,
    datos: {
      sedeNombre: sucursal?.nombre ?? "",
      razonSocial: config.razon_social,
      cuit: config.cuit,
      direccion: sucursal?.direccion ?? null,
      numero: numeroFacturaC(factura.pto_vta, factura.cbte_nro),
      fechaEmision: factura.fecha_emision,
      clienteNombre,
      clienteDocumento: documentoReceptor(factura.doc_tipo, factura.doc_nro),
      clienteCondicionIva: CONDICION_IVA_RECEPTOR[factura.condicion_iva_receptor_id ?? 5] ?? "Consumidor Final",
      concepto:
        tipo === "externa"
          ? "Servicios"
          : `Servicios de residencia geriátrica${aNombreDeOtro ? ` — Residente: ${nombreResidente}` : ""}`,
      textoPeriodo:
        factura.periodo_desde && factura.periodo_hasta
          ? `Período del ${formatearFechaFactura(factura.periodo_desde)} al ${formatearFechaFactura(factura.periodo_hasta)}`
          : "",
      condicionVenta: factura.condicion_venta
        ? (ETIQUETA_CONDICION_VENTA[factura.condicion_venta] ?? factura.condicion_venta)
        : null,
      medioPago: factura.medio_pago ? (ETIQUETA_MEDIO_PAGO[factura.medio_pago] ?? factura.medio_pago) : null,
      lineas:
        factura.detalle && factura.detalle.length > 0
          ? factura.detalle
          : [{ descripcion: "Servicios de cuidado geriátrico", importe: Number(factura.importe) }],
      importe: Number(factura.importe),
      cae: factura.cae,
      caeVencimiento: factura.cae_vencimiento,
      qrDataUri,
    },
  };
}
