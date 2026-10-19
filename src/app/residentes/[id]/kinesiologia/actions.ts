"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Estado = { error: string | null };

function texto(formData: FormData, campo: string): string | null {
  return String(formData.get(campo) ?? "").trim() || null;
}

function entero(formData: FormData, campo: string): number | null {
  const v = String(formData.get(campo) ?? "").trim();
  if (!v) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : null;
}

function revalidar(residenteId: string) {
  revalidatePath(`/residentes/${residenteId}/kinesiologia`);
}

export async function guardarEvaluacionKinesio(
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const fecha = texto(formData, "fecha");
  if (!fecha) return { error: "Indicá la fecha de la evaluación." };

  const dolor = entero(formData, "dolor_eva");
  if (dolor !== null && (dolor < 0 || dolor > 10)) return { error: "El dolor (EVA) va de 0 a 10." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("kinesiologia_evaluaciones").insert({
    residente_id: residenteId,
    fecha,
    motivo: texto(formData, "motivo"),
    diagnostico: texto(formData, "diagnostico"),
    dolor_eva: dolor,
    dolor_localizacion: texto(formData, "dolor_localizacion"),
    movilidad: texto(formData, "movilidad"),
    transferencias: texto(formData, "transferencias"),
    marcha: texto(formData, "marcha"),
    equilibrio: texto(formData, "equilibrio"),
    riesgo_caida: texto(formData, "riesgo_caida"),
    caidas_ultimo_anio: entero(formData, "caidas_ultimo_anio"),
    ayudas_tecnicas: formData.getAll("ayudas_tecnicas").map(String),
    fuerza_muscular: texto(formData, "fuerza_muscular"),
    rango_articular: texto(formData, "rango_articular"),
    objetivos: texto(formData, "objetivos"),
    plan: texto(formData, "plan"),
    sesiones_semanales: entero(formData, "sesiones_semanales"),
    profesional_id: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidar(residenteId);
  return { error: null };
}

export async function registrarSesionKinesio(
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const fecha = texto(formData, "fecha");
  const trabajo = texto(formData, "trabajo_realizado");
  if (!fecha || !trabajo) return { error: "Completá la fecha y el trabajo realizado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("kinesiologia_sesiones").insert({
    residente_id: residenteId,
    fecha,
    duracion_minutos: entero(formData, "duracion_minutos"),
    trabajo_realizado: trabajo,
    tolerancia: texto(formData, "tolerancia"),
    evolucion: texto(formData, "evolucion"),
    profesional_id: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidar(residenteId);
  return { error: null };
}

export async function guardarProgramaKinesio(
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const periodo = texto(formData, "periodo");
  if (!periodo) return { error: "Indicá el período del programa (ej: Oct-Nov-Dic)." };

  const semanas = [1, 2, 3, 4].map((n) => texto(formData, `semana_${n}`));
  if (semanas.every((s) => s === null)) {
    return { error: "Cargá las actividades de al menos una semana." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("kinesiologia_programas").insert({
    residente_id: residenteId,
    periodo,
    objetivos: texto(formData, "objetivos"),
    semana_1: semanas[0],
    semana_2: semanas[1],
    semana_3: semanas[2],
    semana_4: semanas[3],
    observaciones: texto(formData, "observaciones"),
    matricula: texto(formData, "matricula"),
    profesional_id: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidar(residenteId);
  return { error: null };
}

const TABLA_KINESIO = {
  evaluacion: "kinesiologia_evaluaciones",
  sesion: "kinesiologia_sesiones",
  programa: "kinesiologia_programas",
} as const;

export async function eliminarRegistroKinesio(
  residenteId: string,
  tabla: keyof typeof TABLA_KINESIO,
  registroId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from(TABLA_KINESIO[tabla]).delete().eq("id", registroId);
  revalidar(residenteId);
}
