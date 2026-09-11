"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

export type ActualizarHabilitacionEstado = { error: string | null };

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
  return { error: null };
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
