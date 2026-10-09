"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MenuSemanal, MenuSemanalContenido } from "@/lib/types";
import { COLUMNAS_FICHA_NUTRICION, type FichaNutricion } from "@/lib/nutricion";

type Estado = { error: string | null; guardado?: boolean };

function rutaNutricion(sucursalId: string, sub?: string): string {
  return `/sucursales/${sucursalId}/nutricion${sub ? `/${sub}` : ""}`;
}

// ---------- Ficha nutricional (formulario de la nutricionista) ----------

// Fichas de los residentes, de la más nueva a la más vieja.
export async function listarFichasNutricion(residenteIds: string[]): Promise<FichaNutricion[]> {
  if (residenteIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("fichas_nutricion")
    .select(COLUMNAS_FICHA_NUTRICION)
    .in("residente_id", residenteIds)
    .order("periodo", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<FichaNutricion[]>();
  return data ?? [];
}

function texto(formData: FormData, campo: string): string | null {
  return String(formData.get(campo) ?? "").trim() || null;
}

function numero(formData: FormData, campo: string): number | null {
  const valor = String(formData.get(campo) ?? "").trim().replace(",", ".");
  if (!valor) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function siNo(formData: FormData, campo: string): boolean | null {
  const valor = formData.get(campo);
  return valor === "si" ? true : valor === "no" ? false : null;
}

// Guarda la ficha del mes: una por residente y por mes (si ya existe la de ese mes, se corrige).
export async function guardarFichaNutricion(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();
  const residenteId = String(formData.get("residente_id") ?? "");
  const periodo = String(formData.get("periodo") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  if (!residenteId || !/^\d{4}-\d{2}$/.test(periodo)) return { error: "Falta el mes de la ficha." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Falta la fecha." };

  const talla = numero(formData, "talla");
  const pesoActual = numero(formData, "peso_actual");
  // Talla en metros (si la escriben en cm, se pasa a metros).
  const tallaMetros = talla && talla > 3 ? Math.round(talla) / 100 : talla;
  const imc =
    pesoActual && tallaMetros ? Math.round((pesoActual / (tallaMetros * tallaMetros)) * 10) / 10 : numero(formData, "imc");
  const perdida = siNo(formData, "perdida_peso");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const datos = {
    residente_id: residenteId,
    periodo,
    fecha,
    diagnostico_principal: texto(formData, "diagnostico_principal"),
    patologias_asociadas: texto(formData, "patologias_asociadas"),
    consistencia: formData.getAll("consistencia").map(String),
    segun_patologia: formData.getAll("segun_patologia").map(String),
    patologia_otra: texto(formData, "patologia_otra"),
    via_administracion: formData.getAll("via_administracion").map(String),
    asistencia: texto(formData, "asistencia"),
    ingesta: texto(formData, "ingesta"),
    protesis_dental: siNo(formData, "protesis_dental"),
    disfagia: texto(formData, "disfagia"),
    suplementacion: formData.getAll("suplementacion").map(String),
    suplementacion_cantidad: texto(formData, "suplementacion_cantidad"),
    peso_actual: pesoActual,
    peso_ideal: numero(formData, "peso_ideal"),
    perdida_peso: perdida,
    perdida_peso_pct: perdida ? numero(formData, "perdida_peso_pct") : null,
    talla: tallaMetros,
    imc,
    evaluacion_nutricional: texto(formData, "evaluacion_nutricional"),
    evaluacion_funcional: formData.getAll("evaluacion_funcional").map(String),
    observaciones: texto(formData, "observaciones"),
    registrado_por: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("fichas_nutricion")
    .upsert(datos, { onConflict: "residente_id,periodo" })
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No tenés permiso para cargar la ficha nutricional." };

  revalidatePath(rutaNutricion(sucursalId));
  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null, guardado: true };
}

export async function eliminarFichaNutricion(sucursalId: string, fichaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("fichas_nutricion").delete().eq("id", fichaId);
  revalidatePath(rutaNutricion(sucursalId));
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

  const menuId = String(formData.get("menu_id") ?? "");
  const datos = {
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
  };

  // Con menu_id se corrige o completa la planilla ya guardada; sin él se crea una nueva.
  const { data, error } = menuId
    ? await supabase.from("menu_semanal").update(datos).eq("id", menuId).select("id")
    : await supabase.from("menu_semanal").insert(datos).select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No tenés permiso para modificar esta planilla." };

  revalidatePath(rutaNutricion(sucursalId, "menu-semanal"));
  return { error: null, guardado: true };
}

export async function eliminarMenuSemanal(sucursalId: string, menuId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("menu_semanal").delete().eq("id", menuId);
  revalidatePath(rutaNutricion(sucursalId, "menu-semanal"));
}
