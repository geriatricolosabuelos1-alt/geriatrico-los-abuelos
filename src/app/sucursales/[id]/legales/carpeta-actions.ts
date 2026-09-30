"use server";

import { createClient } from "@/lib/supabase/server";
import { listarDocumentosHabilitacion, listarItemsHabilitacion } from "@/app/sucursales/[id]/legales/habilitacion/actions";
import { listarContratosSalud, listarRetirosResiduos } from "@/app/sucursales/[id]/legales/sanitario-actions";
import { listarLibretas } from "@/app/sucursales/[id]/legales/libretas-actions";
import { mesAnioArgentina } from "@/lib/fechas";
import { enviarMailConAdjunto } from "@/lib/mail";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EnviarCarpetaPorMailEstado = { error: string | null; ok: boolean };

// El PDF se arma en el navegador (necesita convertir imágenes a canvas); acá solo lo mandamos por mail.
export async function enviarCarpetaPorMail(
  destinatario: string,
  nombreSede: string,
  nombreArchivo: string,
  pdfBase64: string,
): Promise<EnviarCarpetaPorMailEstado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Tenés que iniciar sesión.", ok: false };
  }

  const destino = destinatario.trim();
  if (!EMAIL_VALIDO.test(destino)) {
    return { error: "Ingresá un mail válido.", ok: false };
  }
  if (!pdfBase64) {
    return { error: "No se generó el PDF.", ok: false };
  }

  try {
    const contenido = Buffer.from(pdfBase64, "base64");
    // Un PDF corrupto/incompleto pesa unos pocos bytes; evita mandar un adjunto vacío.
    if (contenido.length < 1000) {
      return { error: "El PDF salió vacío. Probá generarlo de nuevo.", ok: false };
    }
    await enviarMailConAdjunto({
      destinatario: destino,
      asunto: `Documentación legal — ${nombreSede}`,
      texto: `Adjuntamos la documentación legal de ${nombreSede}.`,
      adjunto: { nombreArchivo, contenido, contentType: "application/pdf" },
    });
    return { error: null, ok: true };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error desconocido al enviar el mail.";
    return { error: mensaje, ok: false };
  }
}

export type ItemCarpeta = {
  categoria: string;
  descripcion: string;
  presentado: boolean;
  fechaPresentacion: string | null;
  notas: string | null;
  nombreArchivo: string | null;
  urlArchivo: string | null;
};

export type DatosCarpeta = {
  sede: string;
  direccion: string | null;
  items: ItemCarpeta[];
  contratos: { proveedor: string; tipo: string; contacto: string | null; vencimiento: string | null }[];
  libretas: { empleado: string; dni: string | null; numero: string | null; emisor: string | null; vence: string | null }[];
  residuos: { fecha: string; empresa: string; kg: number | null; manifiesto: string | null }[];
  emergencias: { prestador: string; total: number; si: number; no: number }[];
  anio: number;
};

// Datos para armar la carpeta de Legales completa (resumen + documentos de habilitación).
export async function obtenerDatosCarpeta(sucursalId: string): Promise<DatosCarpeta | null> {
  const supabase = await createClient();
  const anio = mesAnioArgentina().anio;

  const [{ data: sucursal }, items, docs, contratos, residuos, libretas, { data: emergencias }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("nombre, direccion")
      .eq("id", sucursalId)
      .single<{ nombre: string; direccion: string | null }>(),
    listarItemsHabilitacion(),
    listarDocumentosHabilitacion(sucursalId),
    listarContratosSalud(sucursalId),
    listarRetirosResiduos(sucursalId),
    listarLibretas(sucursalId),
    supabase
      .from("emergencias")
      .select("prestador, satisfactoria")
      .eq("sucursal_id", sucursalId)
      .gte("fecha", `${anio}-01-01`)
      .returns<{ prestador: string; satisfactoria: boolean | null }[]>(),
  ]);

  if (!sucursal) return null;

  const docPorItem = new Map(docs.map((d) => [d.item_id, d]));

  const porPrestador = new Map<string, { total: number; si: number; no: number }>();
  for (const e of emergencias ?? []) {
    const p = porPrestador.get(e.prestador) ?? { total: 0, si: 0, no: 0 };
    p.total++;
    if (e.satisfactoria === true) p.si++;
    if (e.satisfactoria === false) p.no++;
    porPrestador.set(e.prestador, p);
  }

  return {
    sede: sucursal.nombre,
    direccion: sucursal.direccion,
    anio,
    items: items.map((i) => {
      const d = docPorItem.get(i.id);
      return {
        categoria: i.categoria,
        descripcion: i.descripcion,
        presentado: !!d && !!(d.archivo_url || d.fecha_presentacion),
        fechaPresentacion: d?.fecha_presentacion ?? null,
        notas: d?.notas ?? null,
        nombreArchivo: d?.nombre_archivo ?? null,
        urlArchivo: d?.urlFirmada ?? null,
      };
    }),
    contratos: contratos.map((c) => ({
      proveedor: c.proveedor,
      tipo: c.tipo === "area_protegida" ? "Área Protegida" : "Otro",
      contacto: c.contacto,
      vencimiento: c.fecha_vencimiento,
    })),
    libretas: libretas.map((e) => ({
      empleado: e.nombre_completo,
      dni: e.dni,
      numero: e.libreta?.numero ?? null,
      emisor: e.libreta?.emisor ?? null,
      vence: e.libreta?.fecha_vencimiento ?? null,
    })),
    residuos: residuos.map((r) => ({
      fecha: r.fecha,
      empresa: r.empresa,
      kg: r.cantidad_kg,
      manifiesto: r.numero_manifiesto,
    })),
    emergencias: [...porPrestador.entries()].map(([prestador, v]) => ({ prestador, ...v })),
  };
}
