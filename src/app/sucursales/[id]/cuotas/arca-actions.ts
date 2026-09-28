"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteArca } from "@/lib/arca/cliente";
import { obtenerCredencialesArca } from "@/lib/arca/wsaa";
import { solicitarCAE } from "@/lib/arca/wsfe";

export type EmitirFacturaEstado = { error: string | null; ok: boolean };

export type TipoDocReceptor = "dni" | "cuit" | "consumidor_final";

export type CondicionIva = "responsable_inscripto" | "monotributo" | "exento" | "consumidor_final";

export type CondicionVenta = "contado" | "cuenta_corriente";
export type MedioPagoFactura = "efectivo" | "transferencia" | "mercado_pago";

export type LineaDetalle = { descripcion: string; importe: number };

export type DatosFactura = {
  detalle: LineaDetalle[];
  periodoDesde: string;
  periodoHasta: string;
  tipoDoc: TipoDocReceptor;
  docNro: string;
  condicionIva: CondicionIva;
  condicionVenta: CondicionVenta;
  medioPago: MedioPagoFactura | null;
};

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const DOC_TIPO_AFIP: Record<TipoDocReceptor, number> = {
  dni: 96,
  cuit: 80,
  consumidor_final: 99,
};

const CONDICION_IVA_AFIP: Record<CondicionIva, number> = {
  responsable_inscripto: 1,
  monotributo: 6,
  exento: 4,
  consumidor_final: 5,
};

export async function emitirFactura(
  pagoId: string,
  datos: DatosFactura,
): Promise<EmitirFacturaEstado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const detalle = (datos.detalle ?? []).map((l) => ({
    descripcion: String(l.descripcion ?? "").trim(),
    importe: Math.round(Number(l.importe) * 100) / 100,
  }));

  if (detalle.length === 0) {
    return { error: "Agregá al menos una línea al detalle.", ok: false };
  }
  if (detalle.some((l) => !l.descripcion)) {
    return { error: "Todas las líneas del detalle necesitan descripción.", ok: false };
  }
  if (detalle.some((l) => !Number.isFinite(l.importe) || l.importe <= 0)) {
    return { error: "Todas las líneas del detalle necesitan un importe mayor a cero.", ok: false };
  }

  if (!FECHA_ISO.test(datos.periodoDesde) || !FECHA_ISO.test(datos.periodoHasta)) {
    return { error: "Elegí el período facturado (desde y hasta).", ok: false };
  }
  if (datos.periodoDesde > datos.periodoHasta) {
    return { error: "El período 'desde' no puede ser posterior al 'hasta'.", ok: false };
  }

  if (datos.tipoDoc !== "consumidor_final") {
    const limpio = datos.docNro.replace(/\D/g, "");
    if (datos.tipoDoc === "dni" && (limpio.length < 7 || limpio.length > 8)) {
      return { error: "El DNI ingresado no es válido.", ok: false };
    }
    if (datos.tipoDoc === "cuit" && limpio.length !== 11) {
      return { error: "El CUIT ingresado debe tener 11 dígitos.", ok: false };
    }
  }

  const { data: pago } = await supabase
    .from("pagos")
    .select("id, residente_id, sucursal_id, monto, monto_pagado, mes, anio")
    .eq("id", pagoId)
    .single<{
      id: string;
      residente_id: string;
      sucursal_id: string;
      monto: number;
      monto_pagado: number;
      mes: number;
      anio: number;
    }>();

  if (!pago) {
    return { error: "No se encontró el pago.", ok: false };
  }

  const { data: yaFacturado } = await supabase
    .from("facturas_arca")
    .select("id")
    .eq("pago_id", pagoId)
    .maybeSingle<{ id: string }>();

  if (yaFacturado) {
    return { error: "Este pago ya tiene una factura emitida.", ok: false };
  }

  // El pago se leyó con la sesión del usuario: si llegó hasta acá, tiene permiso sobre esta sede.
  const arca = await clienteArca();
  const { data: config } = await arca
    .from("arca_config")
    .select("cuit, pto_vta, cert, private_key, activo")
    .eq("sucursal_id", pago.sucursal_id)
    .maybeSingle<{
      cuit: string;
      pto_vta: number;
      cert: string;
      private_key: string;
      activo: boolean;
    }>();

  if (!config || !config.activo) {
    return {
      error: "Esta sede todavía no tiene la facturación electrónica configurada.",
      ok: false,
    };
  }

  const importe = Math.round(detalle.reduce((acc, l) => acc + l.importe, 0) * 100) / 100;
  const docTipo = DOC_TIPO_AFIP[datos.tipoDoc];
  const docNro = datos.tipoDoc === "consumidor_final" ? "0" : datos.docNro.replace(/\D/g, "");
  const condicionIVAReceptorId = CONDICION_IVA_AFIP[datos.condicionIva];

  try {
    const { token, sign } = await obtenerCredencialesArca(
      pago.sucursal_id,
      config.cert,
      config.private_key,
    );

    const resultado = await solicitarCAE(
      { token, sign, cuit: config.cuit },
      {
        cuit: config.cuit,
        ptoVta: config.pto_vta,
        importe,
        docTipo,
        docNro,
        condicionIVAReceptorId,
        servDesde: datos.periodoDesde.replaceAll("-", ""),
        servHasta: datos.periodoHasta.replaceAll("-", ""),
      },
    );

    const { error: errorInsert } = await supabase.from("facturas_arca").insert({
      pago_id: pago.id,
      residente_id: pago.residente_id,
      sucursal_id: pago.sucursal_id,
      tipo_cbte: 11,
      pto_vta: config.pto_vta,
      cbte_nro: resultado.cbteNro,
      cae: resultado.cae,
      cae_vencimiento: resultado.caeVencimiento,
      importe,
      fecha_emision: resultado.fechaEmision,
      doc_tipo: docTipo,
      doc_nro: docNro,
      condicion_iva_receptor_id: condicionIVAReceptorId,
      condicion_venta: datos.condicionVenta,
      medio_pago: datos.medioPago,
      // Quién la emitió (lo usa también el módulo de Seguridad).
      emitido_por: user?.id ?? null,
      detalle,
      periodo_desde: datos.periodoDesde,
      periodo_hasta: datos.periodoHasta,
    });

    if (errorInsert) {
      return {
        error: `ARCA aprobó la factura (CAE ${resultado.cae}) pero no se pudo guardar en el sistema: ${errorInsert.message}. Anotá este CAE manualmente.`,
        ok: false,
      };
    }

    revalidatePath(`/residentes/${pago.residente_id}/cuenta-corriente`);
    return { error: null, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido al facturar.";
    return { error: message, ok: false };
  }
}
