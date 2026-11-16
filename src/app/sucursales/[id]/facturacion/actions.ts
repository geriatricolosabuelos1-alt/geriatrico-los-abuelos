"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteArca } from "@/lib/arca/cliente";
import { obtenerCredencialesArca } from "@/lib/arca/wsaa";
import { solicitarCAE } from "@/lib/arca/wsfe";
import { hoyArgentina } from "@/lib/fechas";
import { DOC_TIPO_ARCA, cuitValido, type TipoDocExterno } from "@/lib/facturacion";
import type {
  CondicionIva,
  CondicionVenta,
  LineaDetalle,
  MedioPagoFactura,
} from "@/app/sucursales/[id]/cuotas/arca-actions";

export type DatosFacturaExterna = {
  fecha: string;
  periodoDesde: string;
  periodoHasta: string;
  receptorNombre: string;
  tipoDoc: TipoDocExterno;
  docNro: string;
  condicionIva: CondicionIva;
  condicionVenta: CondicionVenta;
  medioPago: MedioPagoFactura | null;
  detalle: LineaDetalle[];
};

export type EmitirFacturaExternaEstado = { error: string | null; facturaId: string | null };

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const CONDICION_IVA_AFIP: Record<CondicionIva, number> = {
  responsable_inscripto: 1,
  monotributo: 6,
  exento: 4,
  consumidor_final: 5,
};

const ROLES_FACTURACION = ["admin", "gerente_sede", "administrativo"];

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function fallo(error: string): EmitirFacturaExternaEstado {
  return { error, facturaId: null };
}

export async function emitirFacturaExterna(
  sucursalId: string,
  datos: DatosFacturaExterna,
): Promise<EmitirFacturaExternaEstado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fallo("Tu sesión expiró. Volvé a ingresar.");

  // La configuración de ARCA se lee con la llave de servicio: antes se controla que el usuario pueda facturar en esta sede.
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, sucursal_id")
    .eq("id", user.id)
    .single<{ rol: string; sucursal_id: string | null }>();
  if (
    !perfil ||
    !ROLES_FACTURACION.includes(perfil.rol) ||
    (perfil.rol !== "admin" && perfil.sucursal_id !== sucursalId)
  ) {
    return fallo("No tenés permiso para facturar en esta sede.");
  }

  const receptorNombre = datos.receptorNombre.trim();
  if (!receptorNombre) return fallo("Indicá a nombre de quién se factura.");

  const docNro = datos.docNro.replace(/\D/g, "");
  if (datos.tipoDoc === "dni") {
    if (docNro.length < 7 || docNro.length > 8) return fallo("El DNI ingresado no es válido.");
  } else if (!cuitValido(docNro)) {
    return fallo(`El ${datos.tipoDoc.toUpperCase()} ingresado no es válido (revisá los 11 números).`);
  }

  const detalle = (datos.detalle ?? []).map((l) => ({
    descripcion: String(l.descripcion ?? "").trim(),
    importe: Math.round(Number(l.importe) * 100) / 100,
  }));
  if (detalle.length === 0) return fallo("Agregá al menos una línea al detalle.");
  if (detalle.some((l) => !l.descripcion)) return fallo("Todas las líneas del detalle necesitan descripción.");
  if (detalle.some((l) => !Number.isFinite(l.importe) || l.importe <= 0)) {
    return fallo("Todas las líneas del detalle necesitan un monto mayor a cero.");
  }

  if (!FECHA_ISO.test(datos.fecha)) return fallo("Elegí la fecha de la factura.");
  const hoy = hoyArgentina();
  if (datos.fecha < sumarDias(hoy, -10) || datos.fecha > sumarDias(hoy, 10)) {
    return fallo("ARCA solo acepta facturas con fecha de hasta 10 días antes o después de hoy.");
  }
  if (!FECHA_ISO.test(datos.periodoDesde) || !FECHA_ISO.test(datos.periodoHasta)) {
    return fallo("Elegí el período facturado (desde y hasta).");
  }
  if (datos.periodoDesde > datos.periodoHasta) {
    return fallo("El período 'desde' no puede ser posterior al 'hasta'.");
  }

  const arca = await clienteArca();
  const { data: config } = await arca
    .from("arca_config")
    .select("cuit, pto_vta, cert, private_key, activo")
    .eq("sucursal_id", sucursalId)
    .maybeSingle<{ cuit: string; pto_vta: number; cert: string; private_key: string; activo: boolean }>();
  if (!config || !config.activo) {
    return fallo("Esta sede todavía no tiene la facturación electrónica configurada.");
  }

  const importe = Math.round(detalle.reduce((acc, l) => acc + l.importe, 0) * 100) / 100;
  const docTipo = DOC_TIPO_ARCA[datos.tipoDoc];
  const condicionIVAReceptorId = CONDICION_IVA_AFIP[datos.condicionIva];

  try {
    const { token, sign } = await obtenerCredencialesArca(sucursalId, config.cert, config.private_key);
    const resultado = await solicitarCAE(
      { token, sign, cuit: config.cuit },
      {
        cuit: config.cuit,
        ptoVta: config.pto_vta,
        importe,
        docTipo,
        docNro,
        condicionIVAReceptorId,
        fecha: datos.fecha.replaceAll("-", ""),
        servDesde: datos.periodoDesde.replaceAll("-", ""),
        servHasta: datos.periodoHasta.replaceAll("-", ""),
      },
    );

    const { data: factura, error } = await supabase
      .from("facturas_externas")
      .insert({
        sucursal_id: sucursalId,
        receptor_nombre: receptorNombre,
        doc_tipo: docTipo,
        doc_nro: docNro,
        condicion_iva_receptor_id: condicionIVAReceptorId,
        tipo_cbte: 11,
        pto_vta: config.pto_vta,
        cbte_nro: resultado.cbteNro,
        cae: resultado.cae,
        cae_vencimiento: resultado.caeVencimiento,
        importe,
        fecha_emision: resultado.fechaEmision,
        periodo_desde: datos.periodoDesde,
        periodo_hasta: datos.periodoHasta,
        detalle,
        condicion_venta: datos.condicionVenta,
        medio_pago: datos.medioPago,
        emitido_por: user.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !factura) {
      return fallo(
        `ARCA aprobó la factura (CAE ${resultado.cae}) pero no se pudo guardar en el sistema: ${error?.message ?? "sin respuesta"}. Anotá este CAE manualmente.`,
      );
    }

    revalidatePath(`/sucursales/${sucursalId}/facturacion`);
    return { error: null, facturaId: factura.id };
  } catch (err) {
    return fallo(err instanceof Error ? err.message : "Error desconocido al facturar.");
  }
}
