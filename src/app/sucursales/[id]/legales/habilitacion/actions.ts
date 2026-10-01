"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarMailConAdjuntos, type AdjuntoMail } from "@/lib/mail";
import type { HabilitacionDocumento, ItemHabilitacion } from "@/lib/types";

const BUCKET = "habilitacion-documentos";
const URL_EXPIRACION_SEGUNDOS = 60 * 10;

export async function listarItemsHabilitacion(): Promise<ItemHabilitacion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items_habilitacion")
    .select("id, categoria, orden, descripcion")
    .order("orden")
    .returns<ItemHabilitacion[]>();

  return data ?? [];
}

export type DocumentoConUrl = HabilitacionDocumento & { urlFirmada: string | null };

export async function listarDocumentosHabilitacion(
  sucursalId: string,
): Promise<DocumentoConUrl[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("habilitacion_documentos")
    .select("id, sucursal_id, item_id, archivo_url, nombre_archivo, fecha_presentacion, notas, updated_at")
    .eq("sucursal_id", sucursalId)
    .returns<HabilitacionDocumento[]>();

  if (!data) return [];

  return Promise.all(
    data.map(async (doc) => {
      if (!doc.archivo_url) {
        return { ...doc, urlFirmada: null };
      }
      const { data: firmada } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.archivo_url, URL_EXPIRACION_SEGUNDOS);
      return { ...doc, urlFirmada: firmada?.signedUrl ?? null };
    }),
  );
}

export type ActualizarHabilitacionEstado = { error: string | null; guardado?: boolean };

async function upsertDocumento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sucursalId: string,
  itemId: string,
  cambios: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { data: existente } = await supabase
    .from("habilitacion_documentos")
    .select("id")
    .eq("sucursal_id", sucursalId)
    .eq("item_id", itemId)
    .maybeSingle<{ id: string }>();

  if (existente) {
    const { error } = await supabase
      .from("habilitacion_documentos")
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq("id", existente.id);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("habilitacion_documentos").insert({
    sucursal_id: sucursalId,
    item_id: itemId,
    ...cambios,
  });
  return { error: error?.message ?? null };
}

export async function subirDocumentoHabilitacion(
  sucursalId: string,
  _estado: ActualizarHabilitacionEstado,
  formData: FormData,
): Promise<ActualizarHabilitacionEstado> {
  const supabase = await createClient();

  const itemId = String(formData.get("item_id") ?? "");
  const archivo = formData.get("archivo");
  const fechaRaw = String(formData.get("fecha_presentacion") ?? "").trim();
  const fecha_presentacion = fechaRaw || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!itemId) {
    return { error: "Falta el ítem a actualizar." };
  }

  let archivo_url: string | undefined;
  let nombre_archivo: string | undefined;

  if (archivo instanceof File && archivo.size > 0) {
    const extension = archivo.name.split(".").pop() || "pdf";
    const path = `${sucursalId}/${itemId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, archivo, { contentType: archivo.type });

    if (uploadError) {
      const mensaje = uploadError.message.toLowerCase();
      if (mensaje.includes("mime")) {
        return { error: "Ese tipo de archivo no se acepta. Subí un PDF o una foto JPG/PNG." };
      }
      if (mensaje.includes("size") || mensaje.includes("exceed")) {
        return { error: "El archivo es demasiado pesado." };
      }
      return { error: uploadError.message };
    }

    archivo_url = path;
    nombre_archivo = archivo.name;
  }

  const { error } = await upsertDocumento(supabase, sucursalId, itemId, {
    ...(archivo_url ? { archivo_url, nombre_archivo } : {}),
    fecha_presentacion,
    notas,
  });

  if (error) {
    return { error };
  }

  revalidatePath(`/sucursales/${sucursalId}/legales/habilitacion`);
  return { error: null, guardado: true };
}

export async function eliminarDocumentoHabilitacion(
  sucursalId: string,
  documentoId: string,
  archivoUrl: string | null,
): Promise<void> {
  const supabase = await createClient();

  if (archivoUrl) {
    await supabase.storage.from(BUCKET).remove([archivoUrl]);
  }

  await supabase.from("habilitacion_documentos").delete().eq("id", documentoId);
  revalidatePath(`/sucursales/${sucursalId}/legales/habilitacion`);
}

export type EnviarDocumentosPorMailEstado = { error: string | null; ok: boolean; mails?: number };

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Gmail admite hasta 25 MB por mail (contando la codificación); se reparte en varios mails si hace falta.
const MAX_BYTES_POR_MAIL = 18 * 1024 * 1024;

// "03 - Solicitud de habilitación (FORMULARIO 003) firmada.pdf": orden + título del ítem,
// sin caracteres que los sistemas de archivos no aceptan, con la extensión del archivo subido.
function nombreAdjunto(orden: number, descripcion: string, original: string): string {
  const extension = original.includes(".") ? original.slice(original.lastIndexOf(".")) : "";
  const titulo = descripcion
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .trim()
    .slice(0, 120)
    .trim();
  return `${String(orden).padStart(2, "0")} - ${titulo}${extension}`;
}

// Manda por mail los archivos cargados en Habilitación, tal cual se subieron:
// algunos (lista de ids: uno o varios) o todos los de la sede (documentoIds = null).
export async function enviarDocumentosHabilitacionPorMail(
  sucursalId: string,
  documentoIds: string[] | null,
  destinatario: string,
): Promise<EnviarDocumentosPorMailEstado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tenés que iniciar sesión.", ok: false };

  const destino = destinatario.trim();
  if (!EMAIL_VALIDO.test(destino)) return { error: "Ingresá un mail válido.", ok: false };

  let consulta = supabase
    .from("habilitacion_documentos")
    .select("id, item_id, archivo_url, nombre_archivo")
    .eq("sucursal_id", sucursalId)
    .not("archivo_url", "is", null);
  if (documentoIds) {
    if (documentoIds.length === 0) return { error: "Seleccioná al menos un documento.", ok: false };
    consulta = consulta.in("id", documentoIds);
  }

  const [{ data: documentos }, items, { data: sucursal }] = await Promise.all([
    consulta.returns<{ id: string; item_id: string; archivo_url: string; nombre_archivo: string | null }[]>(),
    listarItemsHabilitacion(),
    supabase.from("sucursales").select("nombre").eq("id", sucursalId).single<{ nombre: string }>(),
  ]);

  if (!documentos || documentos.length === 0) {
    return { error: "No hay archivos cargados para enviar.", ok: false };
  }

  const itemPorId = new Map(items.map((i) => [i.id, i]));
  const orden = (d: { item_id: string }) => itemPorId.get(d.item_id)?.orden ?? 0;
  const ordenados = [...documentos].sort((a, b) => orden(a) - orden(b));

  const adjuntos: (AdjuntoMail & { descripcion: string })[] = [];
  for (const doc of ordenados) {
    const { data: archivo } = await supabase.storage.from(BUCKET).download(doc.archivo_url);
    if (!archivo) return { error: `No se pudo leer el archivo "${doc.nombre_archivo ?? doc.archivo_url}".`, ok: false };
    const item = itemPorId.get(doc.item_id);
    const original = doc.nombre_archivo ?? doc.archivo_url.split("/").pop() ?? "documento";
    adjuntos.push({
      // El adjunto lleva el nombre del ítem para que se entienda qué documento es.
      nombreArchivo: item ? nombreAdjunto(item.orden, item.descripcion, original) : original,
      contenido: Buffer.from(await archivo.arrayBuffer()),
      contentType: archivo.type || "application/octet-stream",
      descripcion: item?.descripcion ?? "Documento de habilitación",
    });
  }

  // Repartir en tandas que entren en un mail.
  const tandas: (typeof adjuntos)[] = [];
  let actual: typeof adjuntos = [];
  let bytes = 0;
  for (const a of adjuntos) {
    if (actual.length > 0 && bytes + a.contenido.length > MAX_BYTES_POR_MAIL) {
      tandas.push(actual);
      actual = [];
      bytes = 0;
    }
    actual.push(a);
    bytes += a.contenido.length;
  }
  tandas.push(actual);

  const sede = sucursal?.nombre ?? "la sede";
  try {
    for (const [n, tanda] of tandas.entries()) {
      const parte = tandas.length > 1 ? ` (parte ${n + 1} de ${tandas.length})` : "";
      await enviarMailConAdjuntos({
        destinatario: destino,
        asunto: `Documentación legal — ${sede}${parte}`,
        texto: `Adjuntamos la siguiente documentación de ${sede}:\n\n${tanda
          .map((a) => `• ${a.nombreArchivo}`)
          .join("\n")}`,
        adjuntos: tanda,
      });
    }
    return { error: null, ok: true, mails: tandas.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar el mail.", ok: false };
  }
}
