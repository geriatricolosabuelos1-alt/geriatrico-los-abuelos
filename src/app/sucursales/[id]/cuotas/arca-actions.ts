"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerCredencialesArca } from "@/lib/arca/wsaa";
import { solicitarCAE } from "@/lib/arca/wsfe";

export type EmitirFacturaEstado = { error: string | null; ok: boolean };

export type TipoDocReceptor = "dni" | "cuit" | "consumidor_final";

export type CondicionIva = "responsable_inscripto" | "monotributo" | "exento" | "consumidor_final";

export type DatosFactura = {
  importe: number;
  tipoDoc: TipoDocReceptor;
  docNro: string;
  condicionIva: CondicionIva;
};

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

  if (!datos.importe || datos.importe <= 0) {
    return { error: "El importe a facturar debe ser mayor a cero.", ok: false };
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

  const { data: config } = await supabase
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

  const importe = datos.importe;
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
