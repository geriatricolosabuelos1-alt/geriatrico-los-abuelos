"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "residentes-fotos";

export type FotoGaleria = { nombre: string; url: string };

export async function listarFotosGaleria(): Promise<FotoGaleria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).list("galeria", {
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error || !data) {
    return [];
  }

  return data
    .filter((archivo) => archivo.name !== ".emptyFolderPlaceholder")
    .map((archivo) => {
      const path = `galeria/${archivo.name}`;
      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { nombre: archivo.name, url: publicUrlData.publicUrl };
    });
}

export type SubirFotoEstado = { error: string | null; url: string | null };

export async function subirFotoGaleria(
  _estado: SubirFotoEstado,
  formData: FormData,
): Promise<SubirFotoEstado> {
  const supabase = await createClient();
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo de imagen.", url: null };
  }

  const extension = archivo.name.split(".").pop() || "jpg";
  const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const path = `galeria/${nombreArchivo}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, archivo, { contentType: archivo.type });

  if (uploadError) {
    return { error: uploadError.message, url: null };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { error: null, url: publicUrlData.publicUrl };
}

export async function asignarFoto(
  residenteId: string,
  sucursalId: string,
  fotoUrl: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("residentes")
    .update({ foto_url: fotoUrl })
    .eq("id", residenteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  revalidatePath(`/sucursales/${sucursalId}/residentes`);
  return { error: null };
}
