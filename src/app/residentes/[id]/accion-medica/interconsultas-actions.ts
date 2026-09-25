"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InterconsultaCompleta, TipoInterconsulta } from "@/lib/types";

const BUCKET = "residentes-documentos";
const URL_EXPIRACION_SEGUNDOS = 60 * 10;
const TIPOS: TipoInterconsulta[] = ["laboratorio", "derivacion_externa", "kinesiologia", "nutricion"];
const COLUMNAS =
  "id, residente_id, evolucion_id, tipo, detalle, resuelta, creada_por, created_at, fecha_pedido, motivo, profesional, fecha_resultado, resultado, archivo_path, nombre_archivo";

type Estado = { error: string | null };

export type InterconsultaConUrl = InterconsultaCompleta & { urlFirmada: string | null };

function revalidar(residenteId: string) {
  revalidatePath(`/residentes/${residenteId}/accion-medica`);
}

export async function listarInterconsultasCompletas(residenteId: string): Promise<InterconsultaConUrl[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interconsultas")
    .select(COLUMNAS)
    .eq("residente_id", residenteId)
    .order("created_at", { ascending: false })
    .returns<InterconsultaCompleta[]>();

  return Promise.all(
    (data ?? []).map(async (i) => {
      let urlFirmada: string | null = null;
      if (i.archivo_path) {
        const { data: firmada } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(i.archivo_path, URL_EXPIRACION_SEGUNDOS);
        urlFirmada = firmada?.signedUrl ?? null;
      }
      return { ...i, urlFirmada };
    }),
  );
}

export type InterconsultaPendienteSede = InterconsultaCompleta & {
  residentes: { id: string; nombre: string; apellido: string; sucursal_id: string };
};

export async function listarInterconsultasPendientesSede(
  sucursalId: string,
): Promise<InterconsultaPendienteSede[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interconsultas")
    .select(`${COLUMNAS}, residentes!inner(id, nombre, apellido, sucursal_id)`)
    .eq("residentes.sucursal_id", sucursalId)
    .eq("resuelta", false)
    .order("created_at", { ascending: true })
    .returns<InterconsultaPendienteSede[]>();
  return data ?? [];
}

export async function crearInterconsulta(
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const tipo = String(formData.get("tipo") ?? "") as TipoInterconsulta;
  const detalle = String(formData.get("detalle") ?? "").trim() || null;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const fecha_pedido = String(formData.get("fecha_pedido") ?? "").trim() || null;

  if (!TIPOS.includes(tipo)) return { error: "Elegí el tipo de interconsulta." };
  if (tipo === "derivacion_externa" && !detalle) return { error: "Indicá la especialidad." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("interconsultas").insert({
    residente_id: residenteId,
    tipo,
    detalle,
    motivo,
    fecha_pedido,
    creada_por: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidar(residenteId);
  return { error: null };
}

export async function cargarResultadoInterconsulta(
  residenteId: string,
  interconsultaId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const fecha_resultado = String(formData.get("fecha_resultado") ?? "").trim() || null;
  const resultado = String(formData.get("resultado") ?? "").trim() || null;
  const profesional = String(formData.get("profesional") ?? "").trim() || null;
  const archivo = formData.get("archivo");

  if (!fecha_resultado) return { error: "Indicá la fecha del resultado." };
  if (!resultado && !(archivo instanceof File && archivo.size > 0)) {
    return { error: "Escribí el resultado o adjuntá el informe." };
  }

  let archivo_path: string | undefined;
  let nombre_archivo: string | undefined;
  if (archivo instanceof File && archivo.size > 0) {
    const extension = archivo.name.split(".").pop() || "pdf";
    archivo_path = `${residenteId}/interconsulta-${interconsultaId}-${Date.now()}.${extension}`;
    nombre_archivo = archivo.name;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(archivo_path, archivo, { contentType: archivo.type });
    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await supabase
    .from("interconsultas")
    .update({
      fecha_resultado,
      resultado,
      profesional,
      resuelta: true,
      ...(archivo_path ? { archivo_path, nombre_archivo } : {}),
    })
    .eq("id", interconsultaId);
  if (error) return { error: error.message };

  revalidar(residenteId);
  return { error: null };
}

export async function eliminarInterconsulta(residenteId: string, interconsultaId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interconsultas")
    .select("archivo_path")
    .eq("id", interconsultaId)
    .single<{ archivo_path: string | null }>();
  if (data?.archivo_path) await supabase.storage.from(BUCKET).remove([data.archivo_path]);
  await supabase.from("interconsultas").delete().eq("id", interconsultaId);
  revalidar(residenteId);
}
