"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validarOConfigurarPin } from "@/app/residentes/[id]/accion-medica/actions";
import type { EvaluacionMedica, IndicacionMedica, ItemIndicacionMedica } from "@/lib/types";

type Estado = { error: string | null };

async function requiereMedico(): Promise<{ error: string | null; userId: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado.", userId: null };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: string }>();

  if (perfil?.rol !== "medico" && perfil?.rol !== "admin") {
    return { error: "Solo un médico puede firmar esto.", userId: null };
  }

  return { error: null, userId: user.id };
}

// ---------- Evaluación médica + Indicaciones médicas (un solo documento) ----------

export async function listarEvaluacionesMedicas(residenteId: string): Promise<EvaluacionMedica[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluaciones_medicas")
    .select(
      "id, residente_id, fecha, antecedentes, estado_conciencia, orientacion, obs_orientacion, alimentacion, consistencia, obs_alimentacion, marcha_movilidad, control_urinario, control_fecal, obs_esfinteres, conducta, firmado_por, matricula, firmado_at, created_at",
    )
    .eq("residente_id", residenteId)
    .order("fecha", { ascending: false })
    .returns<EvaluacionMedica[]>();
  return data ?? [];
}

export async function listarIndicacionesMedicas(residenteId: string): Promise<IndicacionMedica[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("indicaciones_medicas")
    .select(
      "id, residente_id, periodo_desde, periodo_hasta, items, observaciones, firmado_por, matricula, firmado_at, created_at",
    )
    .eq("residente_id", residenteId)
    .order("periodo_desde", { ascending: false })
    .returns<IndicacionMedica[]>();
  return data ?? [];
}

export type ResidenteListado = { id: string; nombre: string; apellido: string; habitacion: string | null };

export async function listarResidentesSede(sedeId: string): Promise<ResidenteListado[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, habitacion")
    .eq("sucursal_id", sedeId)
    .eq("activo", true)
    .order("habitacion")
    .returns<ResidenteListado[]>();
  return data ?? [];
}

export type DatosResidenteEvaluacion = {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  sede: string;
  obraSocial: string | null;
  afiliado: string | null;
  evaluaciones: EvaluacionMedica[];
  indicaciones: IndicacionMedica[];
};

type ResidenteCompletoRow = {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  dni: string | null;
  fecha_nacimiento: string | null;
  sucursales: { nombre: string } | null;
  ficha_administrativa: { obra_social: string | null; numero_afiliado: string | null } | null;
};

export async function obtenerDatosResidenteEvaluacion(residenteId: string): Promise<DatosResidenteEvaluacion | null> {
  const supabase = await createClient();
  const { data: residente } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, habitacion, dni, fecha_nacimiento, sucursales(nombre), ficha_administrativa(obra_social, numero_afiliado)",
    )
    .eq("id", residenteId)
    .single<ResidenteCompletoRow>();

  if (!residente) return null;

  const [evaluaciones, indicaciones] = await Promise.all([
    listarEvaluacionesMedicas(residenteId),
    listarIndicacionesMedicas(residenteId),
  ]);

  return {
    id: residente.id,
    nombre: residente.nombre,
    apellido: residente.apellido,
    habitacion: residente.habitacion,
    dni: residente.dni,
    fechaNacimiento: residente.fecha_nacimiento,
    sede: residente.sucursales?.nombre ?? "",
    obraSocial: residente.ficha_administrativa?.obra_social ?? null,
    afiliado: residente.ficha_administrativa?.numero_afiliado ?? null,
    evaluaciones,
    indicaciones,
  };
}

export async function guardarEvaluacionIndicacionMedica(
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const { error: errorRol, userId } = await requiereMedico();
  if (errorRol) return { error: errorRol };

  const pin = String(formData.get("pin") ?? "");
  const validacionPin = await validarOConfigurarPin(pin);
  if (validacionPin.error) return { error: validacionPin.error };

  const fecha = String(formData.get("fecha") ?? "");
  if (!fecha) return { error: "Falta la fecha de evaluación." };

  const supabase = await createClient();
  const matricula = String(formData.get("matricula") ?? "").trim() || null;

  const { error: errorEvaluacion } = await supabase.from("evaluaciones_medicas").insert({
    residente_id: residenteId,
    fecha,
    antecedentes: String(formData.get("antecedentes") ?? "").trim() || null,
    estado_conciencia: String(formData.get("estado_conciencia") ?? "").trim() || null,
    orientacion: formData.getAll("orientacion").map(String),
    obs_orientacion: String(formData.get("obs_orientacion") ?? "").trim() || null,
    alimentacion: String(formData.get("alimentacion") ?? "").trim() || null,
    consistencia: String(formData.get("consistencia") ?? "").trim() || null,
    obs_alimentacion: String(formData.get("obs_alimentacion") ?? "").trim() || null,
    marcha_movilidad: String(formData.get("marcha_movilidad") ?? "").trim() || null,
    control_urinario: String(formData.get("control_urinario") ?? "").trim() || null,
    control_fecal: String(formData.get("control_fecal") ?? "").trim() || null,
    obs_esfinteres: String(formData.get("obs_esfinteres") ?? "").trim() || null,
    conducta: String(formData.get("conducta") ?? "").trim() || null,
    firmado_por: userId,
    matricula,
  });
  if (errorEvaluacion) return { error: errorEvaluacion.message };

  let items: ItemIndicacionMedica[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "No se pudo leer el cuadro de medicación." };
  }

  if (Array.isArray(items) && items.length > 0) {
    const periodo_desde = String(formData.get("periodo_desde") ?? "");
    const periodo_hasta = String(formData.get("periodo_hasta") ?? "");
    if (!periodo_desde || !periodo_hasta) return { error: "Indicá el período (desde / hasta)." };

    const { error: errorIndicacion } = await supabase.from("indicaciones_medicas").insert({
      residente_id: residenteId,
      periodo_desde,
      periodo_hasta,
      items,
      observaciones: String(formData.get("observaciones") ?? "").trim() || null,
      firmado_por: userId,
      matricula,
    });
    if (errorIndicacion) return { error: errorIndicacion.message };
  }

  revalidatePath(`/residentes/${residenteId}/accion-medica`);
  return { error: null };
}
