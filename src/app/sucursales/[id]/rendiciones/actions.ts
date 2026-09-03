"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearRendicionEstado = { error: string | null };

export async function crearRendicion(
  sucursalId: string,
  _estado: CrearRendicionEstado,
  formData: FormData,
): Promise<CrearRendicionEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const archivo = formData.get("foto");
  const montoRaw = String(formData.get("monto") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "") || null;
  const monto = montoRaw ? Number(montoRaw) : null;

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Subí una foto del ticket." };
  }

  const extension = archivo.name.split(".").pop() ?? "jpg";
  const rutaArchivo = `${sucursalId}/${crypto.randomUUID()}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from("rendiciones")
    .upload(rutaArchivo, archivo, { contentType: archivo.type });

  if (errorSubida) {
    return { error: errorSubida.message };
  }

  const { error: errorInsert } = await supabase.from("rendiciones").insert({
    sucursal_id: sucursalId,
    monto,
    descripcion,
    imagen_path: rutaArchivo,
    registrado_por: user?.id,
  });

  if (errorInsert) {
    return { error: errorInsert.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/rendiciones`);
  return { error: null };
}
