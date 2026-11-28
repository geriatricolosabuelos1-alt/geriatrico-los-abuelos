"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { clienteArca } from "@/lib/arca/cliente";
import { obtenerCredencialesArca } from "@/lib/arca/wsaa";
import { solicitarCAE } from "@/lib/arca/wsfe";
import { consultarPadron, idsPorDocumento } from "@/lib/arca/padron";
import { enviarFacturaPorMail } from "@/app/sucursales/[id]/facturacion/mail-actions";
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

export type EmitirFacturaExternaEstado = { error: string | null; facturaId: string | null; aviso?: string | null };

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

// La configuración de ARCA se lee con la llave de servicio: antes se controla que el usuario pueda facturar en esta sede.
async function usuarioQuePuedeFacturar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sucursalId: string,
): Promise<string | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró. Volvé a ingresar." };

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
    return { error: "No tenés permiso para facturar en esta sede." };
  }
  return user.id;
}

async function configArca(sucursalId: string) {
  const arca = await clienteArca();
  const { data } = await arca
    .from("arca_config")
    .select("cuit, pto_vta, cert, private_key, activo")
    .eq("sucursal_id", sucursalId)
    .maybeSingle<{ cuit: string; pto_vta: number; cert: string; private_key: string; activo: boolean }>();
  return data?.activo ? data : null;
}

export type BuscarContribuyenteEstado = { nombre: string | null; error: string | null };

// Trae de ARCA el nombre o la razón social de un DNI, CUIT o CUIL para no tener que escribirlo.
export async function buscarContribuyente(
  sucursalId: string,
  numero: string,
): Promise<BuscarContribuyenteEstado> {
  const supabase = await createClient();
  const permiso = await usuarioQuePuedeFacturar(supabase, sucursalId);
  if (typeof permiso !== "string") return { nombre: null, error: permiso.error };

  const id = numero.replace(/\D/g, "");
  const esDni = id.length >= 7 && id.length <= 8;
  if (!esDni && !cuitValido(id)) return { nombre: null, error: "El número no es un DNI, CUIT o CUIL válido." };

  const config = await configArca(sucursalId);
  if (!config) return { nombre: null, error: "Esta sede no tiene ARCA configurado." };

  try {
    const { token, sign } = await obtenerCredencialesArca(sucursalId, config.cert, config.private_key, "ws_sr_padron_a13");
    const auth = { token, sign, cuit: config.cuit };
    // Con DNI: primero se busca su CUIT/CUIL en el padrón y después el nombre.
    const idPersona = esDni ? (await idsPorDocumento(auth, id))[0] : id;
    if (!idPersona) return { nombre: null, error: "ARCA no encontró a nadie con ese DNI. Escribí el nombre a mano." };
    const persona = await consultarPadron(auth, idPersona);
    return { nombre: persona.nombre, error: null };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "";
    if (/no autorizado|not authorized|notAuthorized|cms.cert|computador no autorizado/i.test(mensaje)) {
      return {
        nombre: null,
        error: "ARCA todavía no habilitó la consulta de padrón para el certificado de esta sede. Escribí el nombre a mano.",
      };
    }
    return { nombre: null, error: `No se pudo consultar ARCA${mensaje ? `: ${mensaje}` : "."} Escribí el nombre a mano.` };
  }
}

function fallo(error: string): EmitirFacturaExternaEstado {
  return { error, facturaId: null };
}

export async function emitirFacturaExterna(
  sucursalId: string,
  datos: DatosFacturaExterna,
): Promise<EmitirFacturaExternaEstado> {
  const supabase = await createClient();
  const permiso = await usuarioQuePuedeFacturar(supabase, sucursalId);
  if (typeof permiso !== "string") return fallo(permiso.error);
  const userId = permiso;

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

  const config = await configArca(sucursalId);
  if (!config) {
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
        emitido_por: userId,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !factura) {
      return fallo(
        `ARCA aprobó la factura (CAE ${resultado.cae}) pero no se pudo guardar en el sistema: ${error?.message ?? "sin respuesta"}. Anotá este CAE manualmente.`,
      );
    }

    revalidatePath(`/sucursales/${sucursalId}/facturacion`);
    // Copia automática al mail de facturación; si falla, la factura igual quedó emitida.
    const mail = await enviarFacturaPorMail("externa", factura.id);
    return {
      error: null,
      facturaId: factura.id,
      aviso: mail.error ? `La factura se emitió, pero no se pudo enviar por mail: ${mail.error}` : null,
    };
  } catch (err) {
    return fallo(err instanceof Error ? err.message : "Error desconocido al facturar.");
  }
}
