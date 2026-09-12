"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AlertaNutricion,
  ComidaIngesta,
  EvaluacionMna,
  FichaNutricional,
  MedicionAntropometrica,
  MenuSemanal,
  MenuSemanalContenido,
  PrescripcionDietaria,
  RegistroIngesta,
  RestriccionResidente,
  TipoDieta,
  TipoLiquido,
  ValoracionDeglucion,
} from "@/lib/types";

type Estado = { error: string | null };
const OK: Estado = { error: null };

function rutaNutricion(sucursalId: string, sub?: string): string {
  return `/sucursales/${sucursalId}/nutricion${sub ? `/${sub}` : ""}`;
}

// ---------- Fase 0: ficha nutricional + antropometria ----------

export async function obtenerFichaNutricional(residenteId: string): Promise<FichaNutricional | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ficha_nutricional")
    .select(
      "residente_id, peso_habitual, peso_actual, metodo_pesaje, talla_cm, talla_estimada, circunferencia_pantorrilla, circunferencia_braquial, dinamometria_kg, updated_at",
    )
    .eq("residente_id", residenteId)
    .maybeSingle<FichaNutricional>();
  return data ?? null;
}

export async function listarMediciones(residenteId: string): Promise<MedicionAntropometrica[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mediciones_antropometricas")
    .select("id, residente_id, fecha, peso, circunferencia_pantorrilla, circunferencia_braquial, registrado_por, created_at")
    .eq("residente_id", residenteId)
    .order("fecha", { ascending: false })
    .returns<MedicionAntropometrica[]>();
  return data ?? [];
}

export async function guardarFichaNutricional(
  sucursalId: string,
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };

  const patch = {
    residente_id: residenteId,
    peso_habitual: num("peso_habitual"),
    peso_actual: num("peso_actual"),
    metodo_pesaje: String(formData.get("metodo_pesaje") ?? "").trim() || null,
    talla_cm: num("talla_cm"),
    talla_estimada: formData.get("talla_estimada") === "on",
    circunferencia_pantorrilla: num("circunferencia_pantorrilla"),
    circunferencia_braquial: num("circunferencia_braquial"),
    dinamometria_kg: num("dinamometria_kg"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("ficha_nutricional").upsert(patch, { onConflict: "residente_id" });
  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId));
  return OK;
}

export async function registrarMedicion(
  sucursalId: string,
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };
  const peso = num("peso");
  const cp = num("circunferencia_pantorrilla");
  const cb = num("circunferencia_braquial");

  if (peso === null && cp === null && cb === null) {
    return { error: "Ingresá al menos una medida." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("mediciones_antropometricas").insert({
    residente_id: residenteId,
    peso,
    circunferencia_pantorrilla: cp,
    circunferencia_braquial: cb,
    registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId));
  return OK;
}

// ---------- Fase 1: MNA + alertas ----------

export async function listarEvaluacionesMna(residenteId: string): Promise<EvaluacionMna[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluaciones_mna")
    .select(
      "id, residente_id, fecha, movilidad, estres_agudo, problemas_neuropsicologicos, imc_o_cp, ingesta_reciente, perdida_peso, puntaje, proxima_evaluacion, registrado_por, created_at",
    )
    .eq("residente_id", residenteId)
    .order("fecha", { ascending: false })
    .returns<EvaluacionMna[]>();
  return data ?? [];
}

export async function registrarMna(
  sucursalId: string,
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const n = (k: string) => Number(formData.get(k) ?? 0);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("evaluaciones_mna").insert({
    residente_id: residenteId,
    movilidad: n("movilidad"),
    estres_agudo: n("estres_agudo"),
    problemas_neuropsicologicos: n("problemas_neuropsicologicos"),
    imc_o_cp: n("imc_o_cp"),
    ingesta_reciente: n("ingesta_reciente"),
    perdida_peso: n("perdida_peso"),
    registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId));
  return OK;
}

export async function listarAlertasNutricion(residenteId?: string): Promise<AlertaNutricion[]> {
  const supabase = await createClient();
  let query = supabase
    .from("alertas_nutricion")
    .select("id, residente_id, tipo, nivel, detalle, creada_at, resuelta")
    .eq("resuelta", false)
    .order("creada_at", { ascending: false });

  if (residenteId) query = query.eq("residente_id", residenteId);

  const { data } = await query.returns<AlertaNutricion[]>();
  return data ?? [];
}

export async function resolverAlertaNutricion(sucursalId: string, alertaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("alertas_nutricion").update({ resuelta: true }).eq("id", alertaId);
  revalidatePath(rutaNutricion(sucursalId));
}

// ---------- Fase 2: prescripcion dietaria + restricciones ----------

export async function listarPrescripcionActiva(residenteId: string): Promise<PrescripcionDietaria | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prescripcion_dietaria")
    .select("id, residente_id, tipo_dieta, nivel_iddsi, tipo_liquido, activa, vigente_desde, vigente_hasta, prescripto_por, notas, created_at")
    .eq("residente_id", residenteId)
    .eq("activa", true)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle<PrescripcionDietaria>();
  return data ?? null;
}

export async function listarHistorialDietario(residenteId: string): Promise<PrescripcionDietaria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prescripcion_dietaria")
    .select("id, residente_id, tipo_dieta, nivel_iddsi, tipo_liquido, activa, vigente_desde, vigente_hasta, prescripto_por, notas, created_at")
    .eq("residente_id", residenteId)
    .order("vigente_desde", { ascending: false })
    .returns<PrescripcionDietaria[]>();
  return data ?? [];
}

export async function prescribirDieta(
  sucursalId: string,
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const tipo_dieta = String(formData.get("tipo_dieta") ?? "") as TipoDieta;
  const nivel_iddsi = String(formData.get("nivel_iddsi") ?? "7");
  const tipo_liquido = String(formData.get("tipo_liquido") ?? "normal") as TipoLiquido;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!tipo_dieta) return { error: "Seleccioná un tipo de dieta." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hoy = new Date().toISOString().slice(0, 10);

  await supabase
    .from("prescripcion_dietaria")
    .update({ activa: false, vigente_hasta: hoy })
    .eq("residente_id", residenteId)
    .eq("activa", true);

  const { error } = await supabase.from("prescripcion_dietaria").insert({
    residente_id: residenteId,
    tipo_dieta,
    nivel_iddsi,
    tipo_liquido,
    notas,
    prescripto_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId, "dietas"));
  revalidatePath(rutaNutricion(sucursalId, "cocina"));
  return OK;
}

export async function listarRestricciones(residenteId: string): Promise<RestriccionResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restricciones_residente")
    .select("id, residente_id, tipo, detalle, activo, created_at")
    .eq("residente_id", residenteId)
    .eq("activo", true)
    .returns<RestriccionResidente[]>();
  return data ?? [];
}

export async function agregarRestriccion(
  sucursalId: string,
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const tipo = String(formData.get("tipo") ?? "alergia");
  const detalle = String(formData.get("detalle") ?? "").trim();

  if (!detalle) return { error: "Describí la restricción." };

  const { error } = await supabase.from("restricciones_residente").insert({
    residente_id: residenteId,
    tipo,
    detalle,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId, "dietas"));
  revalidatePath(rutaNutricion(sucursalId, "cocina"));
  return OK;
}

export async function quitarRestriccion(sucursalId: string, restriccionId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("restricciones_residente").update({ activo: false }).eq("id", restriccionId);
  revalidatePath(rutaNutricion(sucursalId, "dietas"));
  revalidatePath(rutaNutricion(sucursalId, "cocina"));
}

// ---------- Fase 4: disfagia ----------

export async function listarValoracionesDeglucion(residenteId: string): Promise<ValoracionDeglucion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("valoracion_deglucion")
    .select(
      "id, residente_id, fecha, tos_al_comer, voz_humeda, deglucion_fraccionada, carraspeo, retencion_carrillos, indicacion_espesante, medicacion_triturada, notas, registrado_por, created_at",
    )
    .eq("residente_id", residenteId)
    .order("fecha", { ascending: false })
    .returns<ValoracionDeglucion[]>();
  return data ?? [];
}

export async function registrarValoracionDeglucion(
  sucursalId: string,
  residenteId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const bool = (k: string) => formData.get(k) === "on";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("valoracion_deglucion").insert({
    residente_id: residenteId,
    tos_al_comer: bool("tos_al_comer"),
    voz_humeda: bool("voz_humeda"),
    deglucion_fraccionada: bool("deglucion_fraccionada"),
    carraspeo: bool("carraspeo"),
    retencion_carrillos: bool("retencion_carrillos"),
    indicacion_espesante: String(formData.get("indicacion_espesante") ?? "").trim() || null,
    medicacion_triturada: bool("medicacion_triturada"),
    notas: String(formData.get("notas") ?? "").trim() || null,
    registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId, "disfagia"));
  return OK;
}

// ---------- Fase 5: registro de ingesta ----------

export async function obtenerIngestaDeHoy(residenteId: string): Promise<RegistroIngesta[]> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("registro_ingesta")
    .select("id, residente_id, fecha, comida, porcentaje, vasos_agua, registrado_por, created_at")
    .eq("residente_id", residenteId)
    .eq("fecha", hoy)
    .returns<RegistroIngesta[]>();
  return data ?? [];
}

export async function registrarIngesta(
  sucursalId: string,
  residenteId: string,
  comida: ComidaIngesta,
  porcentaje: 0 | 25 | 50 | 75 | 100,
): Promise<void> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("registro_ingesta")
    .upsert(
      {
        residente_id: residenteId,
        fecha: hoy,
        comida,
        porcentaje,
        registrado_por: user?.id ?? null,
      },
      { onConflict: "residente_id,fecha,comida" },
    );

  revalidatePath(rutaNutricion(sucursalId, "ingesta"));
}

export async function registrarVasosAgua(sucursalId: string, residenteId: string, comida: ComidaIngesta, vasos: number): Promise<void> {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data: existente } = await supabase
    .from("registro_ingesta")
    .select("porcentaje")
    .eq("residente_id", residenteId)
    .eq("fecha", hoy)
    .eq("comida", comida)
    .maybeSingle<{ porcentaje: number }>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("registro_ingesta").upsert(
    {
      residente_id: residenteId,
      fecha: hoy,
      comida,
      porcentaje: existente?.porcentaje ?? 0,
      vasos_agua: vasos,
      registrado_por: user?.id ?? null,
    },
    { onConflict: "residente_id,fecha,comida" },
  );

  revalidatePath(rutaNutricion(sucursalId, "ingesta"));
}

// ---------- Fase 6: menu semanal + control de heladeras ----------

export async function listarMenusSemanales(sucursalId: string): Promise<MenuSemanal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("menu_semanal")
    .select(
      "id, sucursal_id, semana_desde, semana_hasta, contenido, pacientes_sng, pacientes_vegetarianos, pacientes_celiacos, pacientes_diabeticos, observaciones, nutricionista_id, matricula, firmado_at, created_at",
    )
    .eq("sucursal_id", sucursalId)
    .order("semana_desde", { ascending: false })
    .returns<MenuSemanal[]>();
  return data ?? [];
}

export async function guardarMenuSemanal(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const semana_desde = String(formData.get("semana_desde") ?? "");
  const semana_hasta = String(formData.get("semana_hasta") ?? "");
  if (!semana_desde || !semana_hasta) return { error: "Completá el rango de la semana." };

  const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const bloque = (prefijo: string) => {
    const obj: Record<string, string> = {};
    for (const d of dias) obj[d] = String(formData.get(`${prefijo}_${d}`) ?? "").trim();
    return obj;
  };

  const contenido: MenuSemanalContenido = {
    desayunos: bloque("desayuno"),
    meriendas: bloque("merienda"),
    almuerzos: bloque("almuerzo"),
    colaciones: bloque("colacion"),
    cenas: bloque("cena"),
    postres_almuerzo: bloque("postre_almuerzo"),
    postres_cena: bloque("postre_cena"),
  };

  const n = (k: string) => Number(formData.get(k) ?? 0) || 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("menu_semanal").insert({
    sucursal_id: sucursalId,
    semana_desde,
    semana_hasta,
    contenido,
    pacientes_sng: n("pacientes_sng"),
    pacientes_vegetarianos: n("pacientes_vegetarianos"),
    pacientes_celiacos: n("pacientes_celiacos"),
    pacientes_diabeticos: n("pacientes_diabeticos"),
    observaciones: String(formData.get("observaciones") ?? "").trim() || null,
    matricula: String(formData.get("matricula") ?? "").trim() || null,
    nutricionista_id: user?.id ?? null,
    firmado_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath(rutaNutricion(sucursalId, "menu-semanal"));
  return OK;
}

export async function eliminarMenuSemanal(sucursalId: string, menuId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("menu_semanal").delete().eq("id", menuId);
  revalidatePath(rutaNutricion(sucursalId, "menu-semanal"));
}
