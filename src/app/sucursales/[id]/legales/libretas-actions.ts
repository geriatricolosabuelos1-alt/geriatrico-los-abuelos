"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LibretaSanitaria } from "@/lib/types";

const BUCKET = "empleados-documentos";
const URL_EXPIRACION_SEGUNDOS = 60 * 10;
const DIAS_AVISO_LIBRETA = 30;

function rutaLibretas(sucursalId: string): string {
  return `/sucursales/${sucursalId}/legales/libretas`;
}

export type EmpleadoConLibreta = {
  id: string;
  nombre_completo: string;
  dni: string | null;
  libreta: (LibretaSanitaria & { urlFirmada: string | null }) | null;
};

// Devuelve los empleados activos de la sede con su libreta más reciente (por vencimiento).
export async function listarLibretas(sucursalId: string): Promise<EmpleadoConLibreta[]> {
  const supabase = await createClient();

  const [{ data: empleados }, { data: libretas }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre_completo, dni")
      .eq("sucursal_id", sucursalId)
      .eq("activo", true)
      .order("nombre_completo")
      .returns<{ id: string; nombre_completo: string; dni: string | null }[]>(),
    supabase
      .from("libretas_sanitarias")
      .select("*")
      .eq("sucursal_id", sucursalId)
      .order("fecha_vencimiento", { ascending: false })
      .returns<LibretaSanitaria[]>(),
  ]);

  const ultimaPorEmpleado = new Map<string, LibretaSanitaria>();
  for (const l of libretas ?? []) {
    if (!ultimaPorEmpleado.has(l.empleado_id)) ultimaPorEmpleado.set(l.empleado_id, l);
  }

  return Promise.all(
    (empleados ?? []).map(async (e) => {
      const libreta = ultimaPorEmpleado.get(e.id) ?? null;
      let urlFirmada: string | null = null;
      if (libreta?.archivo_path) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(libreta.archivo_path, URL_EXPIRACION_SEGUNDOS);
        urlFirmada = data?.signedUrl ?? null;
      }
      return { ...e, libreta: libreta ? { ...libreta, urlFirmada } : null };
    }),
  );
}

// Cantidad de empleados activos con libreta vencida, por vencer o sin cargar (para el dashboard).
export async function resumenLibretas(
  sucursalId: string,
): Promise<{ vencidas: number; porVencer: number; sinLibreta: number }> {
  const supabase = await createClient();

  const [{ data: empleados }, { data: libretas }] = await Promise.all([
    supabase.from("empleados").select("id").eq("sucursal_id", sucursalId).eq("activo", true),
    supabase
      .from("libretas_sanitarias")
      .select("empleado_id, fecha_vencimiento")
      .eq("sucursal_id", sucursalId),
  ]);

  const vencimientoMax = new Map<string, string>();
  for (const l of libretas ?? []) {
    const actual = vencimientoMax.get(l.empleado_id);
    if (!actual || l.fecha_vencimiento > actual) vencimientoMax.set(l.empleado_id, l.fecha_vencimiento);
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let vencidas = 0;
  let porVencer = 0;
  let sinLibreta = 0;
  for (const e of empleados ?? []) {
    const venc = vencimientoMax.get(e.id);
    if (!venc) {
      sinLibreta++;
      continue;
    }
    const dias = Math.ceil((new Date(venc + "T00:00:00").getTime() - hoy.getTime()) / 86_400_000);
    if (dias < 0) vencidas++;
    else if (dias <= DIAS_AVISO_LIBRETA) porVencer++;
  }

  return { vencidas, porVencer, sinLibreta };
}

export type DatosLibretaLeidos = {
  numero: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  emisor: string | null;
  nombre: string | null;
  dni: string | null;
  error: string | null;
};

function fechaValida(valor: unknown): string | null {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}

function textoOVacio(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

// Lee los datos de la libreta sanitaria desde una foto o PDF usando Gemini.
export async function leerLibretaConIA(formData: FormData): Promise<DatosLibretaLeidos> {
  const vacio: DatosLibretaLeidos = {
    numero: null,
    fecha_emision: null,
    fecha_vencimiento: null,
    emisor: null,
    nombre: null,
    dni: null,
    error: null,
  };
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ...vacio, error: "Subí una foto o PDF de la libreta." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ...vacio, error: "Falta configurar la lectura automática (GEMINI_API_KEY)." };
  }

  const base64 = Buffer.from(await archivo.arrayBuffer()).toString("base64");

  const prompt = `Sos un asistente que lee libretas sanitarias (carnet de salud / libreta de manipulador de alimentos) de Argentina.
Analizá la imagen y devolvé SOLO un objeto JSON, sin texto adicional ni markdown, con este formato exacto:
{"nombre": "<nombre y apellido del titular o null>", "dni": "<DNI solo dígitos o null>", "numero": "<número de libreta o null>", "fecha_emision": "<AAAA-MM-DD o null>", "fecha_vencimiento": "<AAAA-MM-DD o null>", "emisor": "<municipio u organismo que la emitió o null>"}

Reglas:
- Las fechas en la libreta suelen estar en formato DD/MM/AAAA: convertilas a AAAA-MM-DD.
- Si la libreta no muestra el vencimiento pero sí la emisión y la vigencia (ej. "válida por 1 año"), calculá el vencimiento.
- Si un dato no se ve o no estás seguro, poné null. No inventes datos.`;

  let respuesta: Response;
  try {
    respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }, { inline_data: { mime_type: archivo.type, data: base64 } }] },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
  } catch {
    return { ...vacio, error: "No se pudo conectar con el lector automático." };
  }

  if (!respuesta.ok) {
    return { ...vacio, error: `El lector automático devolvió un error (${respuesta.status}).` };
  }

  const cuerpo = await respuesta.json();
  const texto: string = cuerpo?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  let p: Record<string, unknown>;
  try {
    p = JSON.parse(texto);
  } catch {
    return { ...vacio, error: "No se pudo interpretar la lectura de la libreta." };
  }

  return {
    numero: textoOVacio(p.numero),
    fecha_emision: fechaValida(p.fecha_emision),
    fecha_vencimiento: fechaValida(p.fecha_vencimiento),
    emisor: textoOVacio(p.emisor),
    nombre: textoOVacio(p.nombre),
    dni: textoOVacio(p.dni)?.replace(/\D/g, "") || null,
    error: null,
  };
}

type Estado = { error: string | null };

export async function guardarLibreta(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const empleadoId = String(formData.get("empleado_id") ?? "");
  const fechaVencimiento = String(formData.get("fecha_vencimiento") ?? "");
  const archivo = formData.get("archivo");

  if (!empleadoId) return { error: "Elegí el empleado." };
  if (!fechaVencimiento) return { error: "Indicá hasta cuándo está vigente la libreta." };

  let archivoPath: string | null = null;
  let nombreArchivo: string | null = null;

  if (archivo instanceof File && archivo.size > 0) {
    const extension = archivo.name.split(".").pop() || "pdf";
    archivoPath = `libretas/${empleadoId}/${Date.now()}.${extension}`;
    nombreArchivo = archivo.name;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(archivoPath, archivo, { contentType: archivo.type });
    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await supabase.from("libretas_sanitarias").insert({
    empleado_id: empleadoId,
    sucursal_id: sucursalId,
    numero: String(formData.get("numero") ?? "").trim() || null,
    fecha_emision: String(formData.get("fecha_emision") ?? "") || null,
    fecha_vencimiento: fechaVencimiento,
    emisor: String(formData.get("emisor") ?? "").trim() || null,
    archivo_path: archivoPath,
    nombre_archivo: nombreArchivo,
  });

  if (error) {
    if (archivoPath) await supabase.storage.from(BUCKET).remove([archivoPath]);
    return { error: error.message };
  }

  revalidatePath(rutaLibretas(sucursalId));
  revalidatePath(`/sucursales/${sucursalId}/dashboard`);
  return { error: null };
}

export async function eliminarLibreta(sucursalId: string, libretaId: string): Promise<void> {
  const supabase = await createClient();

  const { data: libreta } = await supabase
    .from("libretas_sanitarias")
    .select("archivo_path")
    .eq("id", libretaId)
    .single<{ archivo_path: string | null }>();

  if (libreta?.archivo_path) {
    await supabase.storage.from(BUCKET).remove([libreta.archivo_path]);
  }
  await supabase.from("libretas_sanitarias").delete().eq("id", libretaId);

  revalidatePath(rutaLibretas(sucursalId));
  revalidatePath(`/sucursales/${sucursalId}/dashboard`);
}
