"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listarKardexResidente, validarOConfigurarPin } from "@/app/residentes/[id]/accion-medica/actions";
import { itemsDesdeKardex } from "@/lib/indicaciones";
import type { EvaluacionMedica, IndicacionMedica, ItemIndicacionMedica } from "@/lib/types";

type Estado = { error: string | null };

// Quién guarda: la médica firma con su PIN; administración puede cargarlo para que ella lo firme después.
const ROLES_CARGA = ["admin", "gerente_sede", "administrativo"];

async function usuarioYRol(): Promise<{ error: string | null; userId: string | null; esMedico: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado.", userId: null, esMedico: false };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: string }>();

  if (perfil?.rol === "medico") return { error: null, userId: user.id, esMedico: true };
  if (perfil && ROLES_CARGA.includes(perfil.rol)) return { error: null, userId: user.id, esMedico: false };
  return { error: "No tenés permiso para cargar la evaluación médica.", userId: null, esMedico: false };
}

// ---------- Evaluación médica + Indicaciones médicas (un solo documento) ----------

export async function listarEvaluacionesMedicas(residenteId: string): Promise<EvaluacionMedica[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluaciones_medicas")
    .select(
      "id, residente_id, fecha, antecedentes, estado_conciencia, orientacion, obs_orientacion, alimentacion, consistencia, obs_alimentacion, marcha_movilidad, control_urinario, control_fecal, obs_esfinteres, conducta, firmado_por, matricula, firmado_at, created_at, perfiles!evaluaciones_medicas_firmado_por_fkey(nombre_completo)",
    )
    .eq("residente_id", residenteId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<(EvaluacionMedica & { perfiles: { nombre_completo: string } | null })[]>();
  return (data ?? []).map(({ perfiles, ...e }) => ({ ...e, firmante: perfiles?.nombre_completo ?? null }));
}

export async function listarIndicacionesMedicas(residenteId: string): Promise<IndicacionMedica[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("indicaciones_medicas")
    .select(
      "id, residente_id, periodo_desde, periodo_hasta, items, observaciones, firmado_por, matricula, firmado_at, created_at, perfiles!indicaciones_medicas_firmado_por_fkey(nombre_completo)",
    )
    .eq("residente_id", residenteId)
    .order("periodo_desde", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<(IndicacionMedica & { perfiles: { nombre_completo: string } | null })[]>();
  return (data ?? []).map(({ perfiles, ...i }) => ({ ...i, firmante: perfiles?.nombre_completo ?? null }));
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
  // Medicación activa (kardex) ya armada como cuadro de indicaciones.
  itemsKardex: ItemIndicacionMedica[];
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

  const [evaluaciones, indicaciones, kardex] = await Promise.all([
    listarEvaluacionesMedicas(residenteId),
    listarIndicacionesMedicas(residenteId),
    listarKardexResidente(residenteId),
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
    itemsKardex: itemsDesdeKardex(kardex),
  };
}

// Guarda la evaluación + indicaciones. La médica la firma con su PIN y queda a su nombre.
// Si la carga otra persona (administración), queda "pendiente de firma médica": sin firma de nadie,
// y la médica después la revisa, la corrige si hace falta y la firma (evaluacion_id / indicacion_id).
// Una vez firmada no se puede modificar (lo bloquea la base).
export async function guardarEvaluacionIndicacionMedica(
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const { error: errorRol, userId, esMedico } = await usuarioYRol();
  if (errorRol || !userId) return { error: errorRol ?? "No autenticado." };

  if (esMedico) {
    const validacionPin = await validarOConfigurarPin(String(formData.get("pin") ?? ""));
    if (validacionPin.error) return { error: validacionPin.error };
  }

  const fecha = String(formData.get("fecha") ?? "");
  if (!fecha) return { error: "Falta la fecha de evaluación." };

  const supabase = await createClient();
  const matricula = String(formData.get("matricula") ?? "").trim() || null;
  let evaluacionId = String(formData.get("evaluacion_id") ?? "") || null;
  let indicacionId = String(formData.get("indicacion_id") ?? "") || null;

  // Un solo documento pendiente por residente: si ya hay uno sin firmar, se actualiza ese
  // (así no quedan copias vacías si se toca "Guardar" de nuevo).
  if (!evaluacionId) {
    const { data: pendiente } = await supabase
      .from("evaluaciones_medicas")
      .select("id")
      .eq("residente_id", residenteId)
      .is("firmado_por", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    evaluacionId = pendiente?.id ?? null;
  }
  if (!indicacionId) {
    const { data: pendiente } = await supabase
      .from("indicaciones_medicas")
      .select("id")
      .eq("residente_id", residenteId)
      .is("firmado_por", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    indicacionId = pendiente?.id ?? null;
  }

  // Firma: solo la médica. Lo que carga otra persona queda sin firmar.
  const firma = esMedico
    ? { firmado_por: userId, firmado_at: new Date().toISOString(), matricula }
    : { firmado_por: null, firmado_at: null, matricula };

  const datosEvaluacion = {
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
    ...firma,
  };

  const { error: errorEvaluacion } = evaluacionId
    ? await supabase
        .from("evaluaciones_medicas")
        .update(datosEvaluacion)
        .eq("id", evaluacionId)
        .eq("residente_id", residenteId)
        .is("firmado_por", null)
    : await supabase
        .from("evaluaciones_medicas")
        .insert({ residente_id: residenteId, cargado_por: userId, ...datosEvaluacion });
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

    const datosIndicacion = {
      periodo_desde,
      periodo_hasta,
      items,
      observaciones: String(formData.get("observaciones") ?? "").trim() || null,
      ...firma,
    };
    const { error: errorIndicacion } = indicacionId
      ? await supabase
          .from("indicaciones_medicas")
          .update(datosIndicacion)
          .eq("id", indicacionId)
          .eq("residente_id", residenteId)
          .is("firmado_por", null)
      : await supabase
          .from("indicaciones_medicas")
          .insert({ residente_id: residenteId, cargado_por: userId, ...datosIndicacion });
    if (errorIndicacion) return { error: errorIndicacion.message };
  } else if (indicacionId) {
    // Se vaciaron todas las indicaciones del borrador: se descarta esa parte.
    await supabase.from("indicaciones_medicas").delete().eq("id", indicacionId).is("firmado_por", null);
  }

  revalidatePath(`/residentes/${residenteId}/accion-medica`);
  return { error: null };
}

export type PendienteFirma = {
  residenteId: string;
  nombre: string;
  habitacion: string | null;
  evaluaciones: { id: string; fecha: string }[];
  indicaciones: { id: string; periodoDesde: string; periodoHasta: string }[];
};

type FilaPendiente = { id: string; residente_id: string; residentes: { nombre: string; apellido: string; habitacion: string | null } };

// Evaluaciones e indicaciones cargadas por administración que la médica todavía no firmó, por residente.
export async function listarPendientesFirma(sedeId: string): Promise<PendienteFirma[]> {
  const supabase = await createClient();
  const [{ data: evaluaciones }, { data: indicaciones }] = await Promise.all([
    supabase
      .from("evaluaciones_medicas")
      .select("id, residente_id, fecha, residentes!inner(nombre, apellido, habitacion, sucursal_id)")
      .is("firmado_por", null)
      .eq("residentes.sucursal_id", sedeId)
      .order("fecha")
      .returns<(FilaPendiente & { fecha: string })[]>(),
    supabase
      .from("indicaciones_medicas")
      .select("id, residente_id, periodo_desde, periodo_hasta, residentes!inner(nombre, apellido, habitacion, sucursal_id)")
      .is("firmado_por", null)
      .eq("residentes.sucursal_id", sedeId)
      .order("periodo_desde")
      .returns<(FilaPendiente & { periodo_desde: string; periodo_hasta: string })[]>(),
  ]);

  const porResidente = new Map<string, PendienteFirma>();
  const grupo = (f: FilaPendiente) => {
    const g = porResidente.get(f.residente_id) ?? {
      residenteId: f.residente_id,
      nombre: `${f.residentes.apellido}, ${f.residentes.nombre}`,
      habitacion: f.residentes.habitacion,
      evaluaciones: [],
      indicaciones: [],
    };
    porResidente.set(f.residente_id, g);
    return g;
  };
  (evaluaciones ?? []).forEach((e) => grupo(e).evaluaciones.push({ id: e.id, fecha: e.fecha }));
  (indicaciones ?? []).forEach((i) =>
    grupo(i).indicaciones.push({ id: i.id, periodoDesde: i.periodo_desde, periodoHasta: i.periodo_hasta }),
  );
  return [...porResidente.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// La médica firma de una vez todo lo pendiente de los residentes elegidos (de su sede).
export async function firmarPendientes(
  sedeId: string,
  residenteIds: string[],
  pin: string,
  matricula: string,
): Promise<{ error: string | null; firmados: number }> {
  const { error: errorRol, userId, esMedico } = await usuarioYRol();
  if (errorRol || !userId) return { error: errorRol ?? "No autenticado.", firmados: 0 };
  if (!esMedico) return { error: "Solo la médica puede firmar.", firmados: 0 };
  if (residenteIds.length === 0) return { error: "Elegí al menos un residente.", firmados: 0 };

  const validacionPin = await validarOConfigurarPin(pin);
  if (validacionPin.error) return { error: validacionPin.error, firmados: 0 };

  const supabase = await createClient();
  // Solo residentes de esta sede.
  const { data: deLaSede } = await supabase
    .from("residentes")
    .select("id")
    .eq("sucursal_id", sedeId)
    .in("id", residenteIds)
    .returns<{ id: string }[]>();
  const ids = (deLaSede ?? []).map((r) => r.id);
  if (ids.length === 0) return { error: "No se encontraron esos residentes.", firmados: 0 };

  const firma: Record<string, string> = { firmado_por: userId, firmado_at: new Date().toISOString() };
  if (matricula.trim()) firma.matricula = matricula.trim();

  let firmados = 0;
  for (const tabla of ["evaluaciones_medicas", "indicaciones_medicas"] as const) {
    const { data, error } = await supabase
      .from(tabla)
      .update(firma)
      .in("residente_id", ids)
      .is("firmado_por", null)
      .select("id");
    if (error) return { error: error.message, firmados };
    firmados += data?.length ?? 0;
  }

  revalidatePath(`/sucursales/${sedeId}/accion-medica`);
  revalidatePath(`/sucursales/${sedeId}/accion-medica/evaluacion-medica`);
  return { error: null, firmados };
}
