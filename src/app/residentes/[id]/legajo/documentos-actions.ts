"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentoResidente, TipoDocumentoResidente } from "@/lib/types";

const BUCKET = "residentes-documentos";
const URL_EXPIRACION_SEGUNDOS = 60 * 10;
const ROLES_CONTRATO = ["admin", "administrativo"];

async function puedeGestionarContrato(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: string }>();

  return !!perfil && ROLES_CONTRATO.includes(perfil.rol);
}

export type DocumentoConUrl = DocumentoResidente & { urlFirmada: string | null };

export async function listarDocumentos(residenteId: string): Promise<DocumentoConUrl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos_residente")
    .select("id, residente_id, tipo, nombre_archivo, url, created_at")
    .eq("residente_id", residenteId)
    .order("created_at", { ascending: false })
    .returns<DocumentoResidente[]>();

  if (error || !data) {
    return [];
  }

  const conUrls = await Promise.all(
    data.map(async (doc) => {
      const { data: firmada } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.url, URL_EXPIRACION_SEGUNDOS);
      return { ...doc, urlFirmada: firmada?.signedUrl ?? null };
    }),
  );

  return conUrls;
}

export type SubirDocumentoEstado = { error: string | null };

export async function subirDocumento(
  residenteId: string,
  _estado: SubirDocumentoEstado,
  formData: FormData,
): Promise<SubirDocumentoEstado> {
  const supabase = await createClient();
  const archivo = formData.get("archivo");
  const tipo = String(formData.get("tipo") ?? "") as TipoDocumentoResidente;

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo." };
  }

  if (tipo === "contrato" && !(await puedeGestionarContrato(supabase))) {
    return { error: "Solo administración puede subir el contrato firmado." };
  }

  const extension = archivo.name.split(".").pop() || "pdf";
  const nombreEnStorage = `${residenteId}/${tipo}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(nombreEnStorage, archivo, { contentType: archivo.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: insertError } = await supabase.from("documentos_residente").insert({
    residente_id: residenteId,
    tipo,
    nombre_archivo: archivo.name,
    url: nombreEnStorage,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function eliminarDocumento(
  residenteId: string,
  documentoId: string,
  path: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documentos_residente")
    .select("tipo")
    .eq("id", documentoId)
    .single<{ tipo: TipoDocumentoResidente }>();

  if (doc?.tipo === "contrato" && !(await puedeGestionarContrato(supabase))) {
    return;
  }

  await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("documentos_residente").delete().eq("id", documentoId);
  revalidatePath(`/residentes/${residenteId}/legajo`);
}
