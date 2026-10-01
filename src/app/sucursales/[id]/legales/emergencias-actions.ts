"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Estado = { error: string | null };

const ROLES_LEGALES = ["admin", "gerente_sede", "administrativo"];

async function puedeGestionar(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single<{ rol: string }>();
  return perfil && ROLES_LEGALES.includes(perfil.rol) ? user.id : null;
}

const BUCKET_DOCUMENTOS = "residentes-documentos";
const TIPOS_ARCHIVO = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Guarda la receta / indicación de la ambulancia como documento del residente, vinculada a la llamada.
async function subirIndicacion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emergenciaId: string,
  residenteId: string,
  archivo: File,
): Promise<string | null> {
  if (!TIPOS_ARCHIVO.includes(archivo.type)) return "La indicación tiene que ser un PDF o una foto (JPG/PNG).";
  const extension = archivo.name.split(".").pop() || "pdf";
  const path = `${residenteId}/indicacion_emergencia-${Date.now()}.${extension}`;
  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, archivo, { contentType: archivo.type });
  if (errorSubida) return `No se pudo subir la indicación: ${errorSubida.message}`;
  const { error } = await supabase.from("documentos_residente").insert({
    residente_id: residenteId,
    tipo: "indicacion_emergencia",
    nombre_archivo: archivo.name,
    url: path,
    emergencia_id: emergenciaId,
  });
  if (error) return `No se pudo guardar la indicación: ${error.message}`;
  revalidatePath(`/residentes/${residenteId}/legajo`);
  return null;
}

function revalidar(sucursalId: string) {
  revalidatePath(`/sucursales/${sucursalId}/legales/certificaciones`);
  revalidatePath(`/sucursales/${sucursalId}/legales/emergencias`);
}

export async function registrarEmergencia(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const fecha = String(formData.get("fecha") ?? "").trim();
  const prestador = String(formData.get("prestador") ?? "").trim();
  const satisfactoriaRaw = String(formData.get("satisfactoria") ?? "");
  const demoraRaw = String(formData.get("demora_minutos") ?? "").trim();

  if (!fecha || !prestador) return { error: "Completá la fecha y el prestador." };

  const userId = await puedeGestionar(supabase);
  if (!userId) return { error: "Solo administración puede registrar llamadas de emergencia." };

  const residenteId = String(formData.get("residente_id") ?? "") || null;
  const archivo = formData.get("indicacion");
  const hayArchivo = archivo instanceof File && archivo.size > 0;
  if (hayArchivo && !residenteId) {
    return { error: "Para adjuntar una receta o indicación, elegí el residente." };
  }

  const { data: creada, error } = await supabase.from("emergencias").insert({
    sucursal_id: sucursalId,
    residente_id: residenteId,
    fecha,
    hora: String(formData.get("hora") ?? "").trim() || null,
    prestador,
    motivo: String(formData.get("motivo") ?? "").trim() || null,
    demora_minutos: demoraRaw ? Math.max(0, Math.round(Number(demoraRaw))) : null,
    traslado: formData.get("traslado") === "on",
    satisfactoria: satisfactoriaRaw === "si" ? true : satisfactoriaRaw === "no" ? false : null,
    observaciones: String(formData.get("observaciones") ?? "").trim() || null,
    registrado_por: userId,
  })
    .select("id")
    .single<{ id: string }>();

  if (error || !creada) return { error: error?.message ?? "No se pudo registrar la llamada." };

  if (hayArchivo && residenteId) {
    const errorIndicacion = await subirIndicacion(supabase, creada.id, residenteId, archivo as File);
    if (errorIndicacion) {
      revalidar(sucursalId);
      return { error: `La llamada se registró, pero: ${errorIndicacion}` };
    }
  }

  revalidar(sucursalId);
  return { error: null };
}

// Adjuntar la receta / indicación a una llamada ya registrada.
export async function adjuntarIndicacionEmergencia(
  sucursalId: string,
  emergenciaId: string,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  if (!(await puedeGestionar(supabase))) return { error: "Solo administración puede adjuntar indicaciones." };

  const archivo = formData.get("indicacion");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí un archivo." };

  const { data: emergencia } = await supabase
    .from("emergencias")
    .select("residente_id")
    .eq("id", emergenciaId)
    .single<{ residente_id: string | null }>();
  if (!emergencia?.residente_id) return { error: "La llamada no tiene residente asignado." };

  const errorIndicacion = await subirIndicacion(supabase, emergenciaId, emergencia.residente_id, archivo);
  if (errorIndicacion) return { error: errorIndicacion };

  revalidar(sucursalId);
  return { error: null };
}

export async function eliminarEmergencia(sucursalId: string, emergenciaId: string): Promise<void> {
  const supabase = await createClient();
  if (!(await puedeGestionar(supabase))) return;
  await supabase.from("emergencias").delete().eq("id", emergenciaId);
  revalidar(sucursalId);
}
