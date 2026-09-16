"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inferirGrupoTerapeutico } from "@/lib/clinica";
import type {
  AccionKardex,
  CambioMedicacion,
  CatalogoMedicamento,
  EvolucionMedica,
  EvolucionMedicaAddenda,
  Interconsulta,
  MedicamentoResidente,
  TipoInterconsulta,
  TipoVisitaMedica,
} from "@/lib/types";

type Estado = { error: string | null };

export async function evaluarPolifarmaciaPorGrupo(
  residenteId: string,
  nombreNuevoFarmaco: string,
): Promise<{ grupo: string; farmacosExistentes: string[] } | null> {
  const grupo = inferirGrupoTerapeutico(nombreNuevoFarmaco);
  if (!grupo) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select("nombre")
    .eq("residente_id", residenteId)
    .eq("activo", true)
    .returns<{ nombre: string }[]>();

  const existentes = (data ?? [])
    .filter((m) => inferirGrupoTerapeutico(m.nombre) === grupo)
    .map((m) => m.nombre);

  return existentes.length > 0 ? { grupo, farmacosExistentes: existentes } : null;
}

// ---------- PIN de seguridad (firma digital) ----------

function hashPin(userId: string, pin: string): string {
  return createHash("sha256").update(`${userId}:${pin}:los-abuelos-pin`).digest("hex");
}

export async function tienePinConfigurado(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("perfiles")
    .select("pin_seguridad_hash")
    .eq("id", user.id)
    .single<{ pin_seguridad_hash: string | null }>();

  return !!data?.pin_seguridad_hash;
}

async function validarOConfigurarPin(pin: string): Promise<Estado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  if (!/^\d{4,6}$/.test(pin)) {
    return { error: "El PIN debe tener entre 4 y 6 dígitos." };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("pin_seguridad_hash")
    .eq("id", user.id)
    .single<{ pin_seguridad_hash: string | null }>();

  const hash = hashPin(user.id, pin);

  if (!perfil?.pin_seguridad_hash) {
    const { error } = await supabase.rpc("set_mi_pin", { pin_hash: hash });
    if (error) return { error: error.message };
    return { error: null };
  }

  if (perfil.pin_seguridad_hash !== hash) {
    return { error: "PIN incorrecto." };
  }

  return { error: null };
}

// ---------- Evolucion medica (SOAP) ----------

export async function listarEvolucionesMedicas(residenteId: string): Promise<EvolucionMedica[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evoluciones_medicas")
    .select(
      "id, residente_id, tipo_visita, subjetivo, objetivo, apreciacion_diagnostico, plan_terapeutico, estable, interconsulta_laboratorio, derivacion_especialidad, indicacion_kinesiologia, indicacion_nutricion, firmado_por, matricula, firmado_at, created_at",
    )
    .eq("residente_id", residenteId)
    .order("firmado_at", { ascending: false })
    .returns<EvolucionMedica[]>();
  return data ?? [];
}

export async function listarAddendas(evolucionId: string): Promise<EvolucionMedicaAddenda[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evoluciones_medicas_addendas")
    .select("id, evolucion_id, contenido, autor_id, created_at")
    .eq("evolucion_id", evolucionId)
    .order("created_at", { ascending: true })
    .returns<EvolucionMedicaAddenda[]>();
  return data ?? [];
}

export type GuardarEvolucionEstado = { error: string | null; ok?: boolean };

export async function guardarEvolucionYCerrar(
  residenteId: string,
  siguienteResidenteId: string | null,
  _estado: GuardarEvolucionEstado,
  formData: FormData,
): Promise<GuardarEvolucionEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const pin = String(formData.get("pin") ?? "");
  const validacionPin = await validarOConfigurarPin(pin);
  if (validacionPin.error) return { error: validacionPin.error };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre_completo")
    .eq("id", user.id)
    .single<{ rol: string; nombre_completo: string }>();

  if (perfil?.rol !== "medico" && perfil?.rol !== "admin") {
    return { error: "Solo un médico puede firmar una evolución clínica." };
  }

  const tipo_visita = String(formData.get("tipo_visita") ?? "") as TipoVisitaMedica;
  if (!tipo_visita) return { error: "Seleccioná el tipo de visita." };

  const matricula = String(formData.get("matricula") ?? "").trim() || null;
  const estable = formData.get("estable") === "on";
  const interconsulta_laboratorio = formData.get("interconsulta_laboratorio") === "on";
  const derivacion_especialidad = String(formData.get("derivacion_especialidad") ?? "").trim() || null;
  const indicacion_kinesiologia = String(formData.get("indicacion_kinesiologia") ?? "").trim() || null;
  const indicacion_nutricion = String(formData.get("indicacion_nutricion") ?? "").trim() || null;

  const { data: evolucion, error } = await supabase
    .from("evoluciones_medicas")
    .insert({
      residente_id: residenteId,
      tipo_visita,
      subjetivo: String(formData.get("subjetivo") ?? "").trim() || null,
      objetivo: String(formData.get("objetivo") ?? "").trim() || null,
      apreciacion_diagnostico: String(formData.get("apreciacion_diagnostico") ?? "").trim() || null,
      plan_terapeutico: String(formData.get("plan_terapeutico") ?? "").trim() || null,
      estable,
      interconsulta_laboratorio,
      derivacion_especialidad,
      indicacion_kinesiologia,
      indicacion_nutricion,
      firmado_por: user.id,
      matricula,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !evolucion) return { error: error?.message ?? "No se pudo guardar la evolución." };

  const interconsultas: { tipo: TipoInterconsulta; detalle: string | null }[] = [];
  if (interconsulta_laboratorio) interconsultas.push({ tipo: "laboratorio", detalle: null });
  if (derivacion_especialidad) interconsultas.push({ tipo: "derivacion_externa", detalle: derivacion_especialidad });
  if (indicacion_kinesiologia) interconsultas.push({ tipo: "kinesiologia", detalle: indicacion_kinesiologia });
  if (indicacion_nutricion) interconsultas.push({ tipo: "nutricion", detalle: indicacion_nutricion });

  if (interconsultas.length > 0) {
    await supabase.from("interconsultas").insert(
      interconsultas.map((i) => ({
        residente_id: residenteId,
        evolucion_id: evolucion.id,
        tipo: i.tipo,
        detalle: i.detalle,
        creada_por: user.id,
      })),
    );
  }

  revalidatePath(`/residentes/${residenteId}/accion-medica`);
  if (siguienteResidenteId) revalidatePath(`/residentes/${siguienteResidenteId}/accion-medica`);
  return { error: null, ok: true };
}

export async function agregarAddenda(
  residenteId: string,
  evolucionId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) return { error: "La nota aclaratoria no puede estar vacía." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("evoluciones_medicas_addendas").insert({
    evolucion_id: evolucionId,
    contenido,
    autor_id: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/residentes/${residenteId}/accion-medica`);
  return { error: null };
}

// ---------- Kardex interactivo ----------

export async function listarKardexResidente(residenteId: string): Promise<MedicamentoResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select(
      "id, residente_id, nombre, dosis, dosis_diaria, frecuencia, horario, via_administracion, tipo_administracion, dosis_maxima_diaria, horarios, instrucciones, cantidad_stock, notas, activo, cambio_reciente_at, updated_at",
    )
    .eq("residente_id", residenteId)
    .eq("activo", true)
    .order("nombre")
    .returns<MedicamentoResidente[]>();
  return data ?? [];
}

export type AccionKardexEstado = { error: string | null };

export async function accionKardex(
  residenteId: string,
  _estado: AccionKardexEstado,
  formData: FormData,
): Promise<AccionKardexEstado> {
  const supabase = await createClient();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const accion = String(formData.get("accion") ?? "") as AccionKardex;
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const nuevaDosis = String(formData.get("nueva_dosis") ?? "").trim() || null;

  if (!medicamentoId || !accion) return { error: "Faltan datos." };
  if (accion === "modificar_dosis" && !nuevaDosis) return { error: "Ingresá la nueva dosis." };
  if ((accion === "suspender" || accion === "modificar_dosis") && !motivo) {
    return { error: "Ingresá el motivo." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: actual } = await supabase
    .from("medicamentos_residente")
    .select("dosis")
    .eq("id", medicamentoId)
    .single<{ dosis: string | null }>();

  const ahora = new Date().toISOString();

  if (accion === "suspender") {
    await supabase
      .from("medicamentos_residente")
      .update({ activo: false, cambio_reciente_at: ahora, updated_at: ahora })
      .eq("id", medicamentoId);
  } else if (accion === "modificar_dosis") {
    await supabase
      .from("medicamentos_residente")
      .update({ dosis: nuevaDosis, cambio_reciente_at: ahora, updated_at: ahora })
      .eq("id", medicamentoId);
  } else {
    await supabase
      .from("medicamentos_residente")
      .update({ cambio_reciente_at: ahora })
      .eq("id", medicamentoId);
  }

  const { error } = await supabase.from("cambios_medicacion").insert({
    medicamento_id: medicamentoId,
    residente_id: residenteId,
    accion,
    dosis_anterior: actual?.dosis ?? null,
    dosis_nueva: accion === "modificar_dosis" ? nuevaDosis : null,
    motivo,
    medico_id: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/residentes/${residenteId}/accion-medica`);
  revalidatePath(`/sucursales/${residenteId}/medicacion`);
  return { error: null };
}

export type PrescribirEstado = { error: string | null; aviso?: string };

export async function prescribirFarmacoConAviso(
  residenteId: string,
  _estado: PrescribirEstado,
  formData: FormData,
): Promise<PrescribirEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const dosis = String(formData.get("dosis") ?? "").trim() || null;
  const via_administracion = String(formData.get("via_administracion") ?? "").trim() || null;
  const horario = String(formData.get("horario") ?? "").trim() || null;
  const horarios = String(formData.get("horarios") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const tipo_administracion = formData.get("tipo_administracion") === "sos" ? "sos" : "continua";
  const dosisMaximaRaw = String(formData.get("dosis_maxima_diaria") ?? "").trim();
  const dosis_maxima_diaria = dosisMaximaRaw ? Number(dosisMaximaRaw) : null;
  const confirmarAviso = formData.get("confirmar_aviso") === "on";

  if (!nombre) return { error: "El nombre del fármaco es obligatorio." };

  if (!confirmarAviso) {
    const aviso = await evaluarPolifarmaciaPorGrupo(residenteId, nombre);
    if (aviso) {
      return {
        error: null,
        aviso: `Ya tiene ${aviso.farmacosExistentes.join(", ")} del grupo "${aviso.grupo}". Confirmá para prescribir igual.`,
      };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: nuevo, error } = await supabase
    .from("medicamentos_residente")
    .insert({
      residente_id: residenteId,
      nombre,
      dosis,
      via_administracion,
      horario,
      horarios: horarios.length > 0 ? horarios : null,
      tipo_administracion,
      dosis_maxima_diaria,
      cambio_reciente_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !nuevo) return { error: error?.message ?? "No se pudo prescribir." };

  await supabase.from("cambios_medicacion").insert({
    medicamento_id: nuevo.id,
    residente_id: residenteId,
    accion: "nueva",
    dosis_nueva: dosis,
    medico_id: user?.id ?? null,
  });

  revalidatePath(`/residentes/${residenteId}/accion-medica`);
  return { error: null };
}

// ---------- Catalogo (para autocompletar) ----------

export async function listarCatalogo(): Promise<CatalogoMedicamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalogo_medicamentos")
    .select("id, nombre, dosis, grupo_terapeutico")
    .order("nombre")
    .returns<CatalogoMedicamento[]>();
  return data ?? [];
}

export async function listarCambiosRecientes(residenteId: string): Promise<CambioMedicacion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cambios_medicacion")
    .select("id, medicamento_id, residente_id, evolucion_id, accion, dosis_anterior, dosis_nueva, motivo, medico_id, fecha")
    .eq("residente_id", residenteId)
    .order("fecha", { ascending: false })
    .limit(20)
    .returns<CambioMedicacion[]>();
  return data ?? [];
}

// ---------- Interconsultas ----------

export async function listarInterconsultas(residenteId: string): Promise<Interconsulta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interconsultas")
    .select("id, residente_id, evolucion_id, tipo, detalle, resuelta, creada_por, created_at")
    .eq("residente_id", residenteId)
    .order("created_at", { ascending: false })
    .returns<Interconsulta[]>();
  return data ?? [];
}

export async function resolverInterconsulta(residenteId: string, interconsultaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("interconsultas").update({ resuelta: true }).eq("id", interconsultaId);
  revalidatePath(`/residentes/${residenteId}/accion-medica`);
}
