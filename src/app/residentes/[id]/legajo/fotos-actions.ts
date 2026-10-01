"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "residentes-fotos";

export type FotoGaleria = { nombre: string; url: string };

// Cada sede ve solo sus fotos: los archivos empiezan con el nombre de la sede ("edith2-...").
// Las primeras fotos de EDITH 1 se subieron sin prefijo ("residente-01.jpg"), así que las
// que no tienen prefijo de ninguna sede son de EDITH 1.
const SEDE_FOTOS_SIN_PREFIJO = "edith1";

function prefijoSede(nombreSede: string): string {
  return nombreSede
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function prefijosDeSedes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sucursalId: string,
): Promise<{ propio: string; todos: string[] }> {
  const { data } = await supabase.from("sucursales").select("id, nombre").returns<{ id: string; nombre: string }[]>();
  const todos = (data ?? []).map((s) => prefijoSede(s.nombre));
  const propia = (data ?? []).find((s) => s.id === sucursalId);
  return { propio: propia ? prefijoSede(propia.nombre) : "", todos };
}

export async function listarFotosGaleria(sucursalId: string): Promise<FotoGaleria[]> {
  const supabase = await createClient();
  const [{ data, error }, prefijos] = await Promise.all([
    supabase.storage.from(BUCKET).list("galeria", {
      sortBy: { column: "name", order: "asc" },
      limit: 1000,
    }),
    prefijosDeSedes(supabase, sucursalId),
  ]);

  if (error || !data) {
    return [];
  }

  const deLaSede = (nombre: string) => {
    if (prefijos.propio && nombre.startsWith(`${prefijos.propio}-`)) return true;
    const sinPrefijo = !prefijos.todos.some((p) => p && nombre.startsWith(`${p}-`));
    return sinPrefijo && prefijos.propio === SEDE_FOTOS_SIN_PREFIJO;
  };

  return data
    .filter((archivo) => archivo.name !== ".emptyFolderPlaceholder" && deLaSede(archivo.name))
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
  const sucursalId = String(formData.get("sucursal_id") ?? "");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Elegí un archivo de imagen.", url: null };
  }

  const extension = archivo.name.split(".").pop() || "jpg";
  const { propio } = await prefijosDeSedes(supabase, sucursalId);
  const nombreArchivo = `${propio ? `${propio}-` : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
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
