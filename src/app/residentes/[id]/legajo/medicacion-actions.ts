"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AlertaMedicacion,
  CatalogoMedicamento,
  DosisAdministrada,
  EstadoDosis,
  EstadoToma,
  IngresoMedicamento,
  MedicamentoResidente,
  NivelAlertaMedicacion,
  TomaMar,
} from "@/lib/types";

const COLUMNAS_MEDICAMENTO =
  "id, residente_id, nombre, dosis, dosis_diaria, frecuencia, horario, via_administracion, tipo_administracion, dosis_maxima_diaria, horarios, instrucciones, cantidad_stock, notas, activo, cambio_reciente_at, updated_at";

export async function listarMedicamentos(residenteId: string): Promise<MedicamentoResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select(COLUMNAS_MEDICAMENTO)
    .eq("residente_id", residenteId)
    .order("nombre")
    .returns<MedicamentoResidente[]>();

  return data ?? [];
}

function fechaHoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function obtenerTomasDeHoy(residenteId: string): Promise<TomaMar[]> {
  const supabase = await createClient();

  const { data: medicamentos } = await supabase
    .from("medicamentos_residente")
    .select("id, horarios, tipo_administracion")
    .eq("residente_id", residenteId)
    .eq("activo", true)
    .returns<{ id: string; horarios: string[] | null; tipo_administracion: string }[]>();

  const continuos = (medicamentos ?? []).filter(
    (m) => m.tipo_administracion === "continua" && m.horarios && m.horarios.length > 0,
  );

  if (continuos.length === 0) return [];

  const hoy = fechaHoyISO();
  const { data: registradas } = await supabase
    .from("dosis_administradas")
    .select("id, medicamento_id, horario_previsto, estado, motivo")
    .eq("residente_id", residenteId)
    .gte("fecha", `${hoy}T00:00:00`)
    .lt("fecha", `${hoy}T23:59:59.999`)
    .not("horario_previsto", "is", null)
    .returns<
      { id: string; medicamento_id: string; horario_previsto: string; estado: EstadoDosis; motivo: string | null }[]
    >();

  const porClave = new Map(
    (registradas ?? []).map((r) => [`${r.medicamento_id}-${r.horario_previsto}`, r]),
  );

  const tomas: TomaMar[] = [];
  for (const m of continuos) {
    for (const horario of m.horarios ?? []) {
      const existente = porClave.get(`${m.id}-${horario}`);
      const estado: EstadoToma = existente?.estado ?? "pendiente";
      tomas.push({
        medicamentoId: m.id,
        residenteId,
        horario,
        estado,
        dosisId: existente?.id ?? null,
        motivo: existente?.motivo ?? null,
      });
    }
  }

  return tomas;
}

export async function listarAlertasActivas(residenteId: string): Promise<AlertaMedicacion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("alertas_medicacion")
    .select("id, medicamento_id, residente_id, dias_restantes, nivel, creada_at, notificada, resuelta")
    .eq("residente_id", residenteId)
    .eq("resuelta", false)
    .order("creada_at", { ascending: false })
    .returns<AlertaMedicacion[]>();

  return data ?? [];
}

export async function listarIngresos(medicamentoId: string): Promise<IngresoMedicamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ingresos_medicamento")
    .select("id, medicamento_id, residente_id, cantidad, lote, vencimiento, entregado_por, registrado_por, fecha")
    .eq("medicamento_id", medicamentoId)
    .order("fecha", { ascending: false })
    .returns<IngresoMedicamento[]>();

  return data ?? [];
}

export async function listarDosisAdministradas(medicamentoId: string): Promise<DosisAdministrada[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dosis_administradas")
    .select(
      "id, medicamento_id, residente_id, cantidad, estado, motivo, horario_previsto, administrado_por, fecha",
    )
    .eq("medicamento_id", medicamentoId)
    .order("fecha", { ascending: false })
    .returns<DosisAdministrada[]>();

  return data ?? [];
}

export async function obtenerDosisSosHoy(residenteId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const hoy = fechaHoyISO();
  const { data } = await supabase
    .from("dosis_administradas")
    .select("medicamento_id, cantidad")
    .eq("residente_id", residenteId)
    .eq("estado", "administrado")
    .is("horario_previsto", null)
    .gte("fecha", `${hoy}T00:00:00`)
    .lt("fecha", `${hoy}T23:59:59.999`)
    .returns<{ medicamento_id: string; cantidad: number }[]>();

  const totales: Record<string, number> = {};
  for (const d of data ?? []) {
    totales[d.medicamento_id] = (totales[d.medicamento_id] ?? 0) + d.cantidad;
  }
  return totales;
}

export type RegistrarDosisSosEstado = { error: string | null };

export async function registrarDosisSos(
  sucursalId: string,
  _estado: RegistrarDosisSosEstado,
  formData: FormData,
): Promise<RegistrarDosisSosEstado> {
  const supabase = await createClient();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const residenteId = String(formData.get("residente_id") ?? "");

  if (!medicamentoId || !residenteId) {
    return { error: "Faltan datos del medicamento." };
  }

  const { data: medicamento } = await supabase
    .from("medicamentos_residente")
    .select("dosis_maxima_diaria")
    .eq("id", medicamentoId)
    .single<{ dosis_maxima_diaria: number | null }>();

  if (medicamento?.dosis_maxima_diaria) {
    const totales = await obtenerDosisSosHoy(residenteId);
    const yaDadas = totales[medicamentoId] ?? 0;
    if (yaDadas >= medicamento.dosis_maxima_diaria) {
      return { error: `Ya se alcanzó la dosis máxima diaria (${medicamento.dosis_maxima_diaria}).` };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("dosis_administradas").insert({
    medicamento_id: medicamentoId,
    residente_id: residenteId,
    cantidad: 1,
    estado: "administrado",
    horario_previsto: null,
    administrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/sucursales/${sucursalId}/medicacion`);
  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

async function recalcularAlertas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  medicamentoId: string,
  residenteId: string,
  stockActual: number,
): Promise<void> {
  const { data: medicamento } = await supabase
    .from("medicamentos_residente")
    .select("dosis_diaria")
    .eq("id", medicamentoId)
    .single<{ dosis_diaria: number | null }>();

  const dosisDiaria = medicamento?.dosis_diaria ?? null;
  if (!dosisDiaria || dosisDiaria <= 0) return;

  const diasRestantes = Math.round((stockActual / dosisDiaria) * 10) / 10;
  let nivel: NivelAlertaMedicacion | null = null;
  if (stockActual <= 0) nivel = "sin_stock";
  else if (diasRestantes <= 5) nivel = "aviso_5";
  else if (diasRestantes <= 7) nivel = "aviso_7";

  if (nivel) {
    const { data: existente } = await supabase
      .from("alertas_medicacion")
      .select("id")
      .eq("medicamento_id", medicamentoId)
      .eq("nivel", nivel)
      .eq("resuelta", false)
      .maybeSingle();

    if (!existente) {
      await supabase.from("alertas_medicacion").insert({
        medicamento_id: medicamentoId,
        residente_id: residenteId,
        dias_restantes: diasRestantes,
        nivel,
      });
    }
  } else {
    await supabase
      .from("alertas_medicacion")
      .update({ resuelta: true })
      .eq("medicamento_id", medicamentoId)
      .eq("resuelta", false);
  }
}

export async function listarCatalogoMedicamentos(): Promise<CatalogoMedicamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalogo_medicamentos")
    .select("id, nombre, dosis, grupo_terapeutico")
    .order("nombre")
    .returns<CatalogoMedicamento[]>();

  return data ?? [];
}

async function guardarEnCatalogo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nombre: string,
  dosis: string | null,
): Promise<void> {
  if (!nombre) return;

  if (dosis === null) {
    const { data: existe } = await supabase
      .from("catalogo_medicamentos")
      .select("id")
      .eq("nombre", nombre)
      .is("dosis", null)
      .maybeSingle();
    if (!existe) {
      await supabase.from("catalogo_medicamentos").insert({ nombre, dosis: null });
    }
    return;
  }

  await supabase
    .from("catalogo_medicamentos")
    .upsert({ nombre, dosis }, { onConflict: "nombre,dosis", ignoreDuplicates: true });
}

export type MedicamentoEstado = { error: string | null };

function parsearHorarios(valor: FormDataEntryValue | null): string[] | null {
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const horarios = texto
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return horarios.length > 0 ? horarios : null;
}

export async function agregarMedicamento(
  residenteId: string,
  _estado: MedicamentoEstado,
  formData: FormData,
): Promise<MedicamentoEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const dosis = String(formData.get("dosis") ?? "").trim() || null;
  const dosisDiariaRaw = String(formData.get("dosis_diaria") ?? "").trim();
  const dosis_diaria = dosisDiariaRaw ? Number(dosisDiariaRaw) : null;
  const frecuencia = String(formData.get("frecuencia") ?? "").trim() || null;
  const horario = String(formData.get("horario") ?? "").trim() || null;
  const via_administracion = String(formData.get("via_administracion") ?? "").trim() || null;
  const tipo_administracion = formData.get("tipo_administracion") === "sos" ? "sos" : "continua";
  const dosisMaximaRaw = String(formData.get("dosis_maxima_diaria") ?? "").trim();
  const dosis_maxima_diaria = dosisMaximaRaw ? Number(dosisMaximaRaw) : null;
  const horarios = parsearHorarios(formData.get("horarios"));
  const instrucciones = String(formData.get("instrucciones") ?? "").trim() || null;
  const cantidad_stock = Number(formData.get("cantidad_stock") ?? 0);

  if (!nombre) {
    return { error: "El nombre del medicamento es obligatorio." };
  }

  const { error } = await supabase.from("medicamentos_residente").insert({
    residente_id: residenteId,
    nombre,
    dosis,
    dosis_diaria,
    frecuencia,
    horario,
    via_administracion,
    tipo_administracion,
    dosis_maxima_diaria,
    horarios,
    instrucciones,
    cantidad_stock,
  });

  if (error) {
    return { error: error.message };
  }

  await guardarEnCatalogo(supabase, nombre, dosis);

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function actualizarPrescripcion(
  residenteId: string,
  _estado: MedicamentoEstado,
  formData: FormData,
): Promise<MedicamentoEstado> {
  const supabase = await createClient();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const dosis = String(formData.get("dosis") ?? "").trim() || null;
  const dosisDiariaRaw = String(formData.get("dosis_diaria") ?? "").trim();
  const dosis_diaria = dosisDiariaRaw ? Number(dosisDiariaRaw) : null;
  const frecuencia = String(formData.get("frecuencia") ?? "").trim() || null;
  const horario = String(formData.get("horario") ?? "").trim() || null;
  const via_administracion = String(formData.get("via_administracion") ?? "").trim() || null;
  const tipo_administracion = formData.get("tipo_administracion") === "sos" ? "sos" : "continua";
  const dosisMaximaRaw = String(formData.get("dosis_maxima_diaria") ?? "").trim();
  const dosis_maxima_diaria = dosisMaximaRaw ? Number(dosisMaximaRaw) : null;
  const horarios = parsearHorarios(formData.get("horarios"));
  const instrucciones = String(formData.get("instrucciones") ?? "").trim() || null;

  if (!medicamentoId || !nombre) {
    return { error: "Falta el nombre del medicamento." };
  }

  const { error } = await supabase
    .from("medicamentos_residente")
    .update({
      nombre,
      dosis,
      dosis_diaria,
      frecuencia,
      horario,
      via_administracion,
      tipo_administracion,
      dosis_maxima_diaria,
      horarios,
      instrucciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", medicamentoId);

  if (error) {
    return { error: error.message };
  }

  await guardarEnCatalogo(supabase, nombre, dosis);

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export type AjustarStockEstado = { error: string | null };

export async function ajustarStock(
  residenteId: string,
  _estado: AjustarStockEstado,
  formData: FormData,
): Promise<AjustarStockEstado> {
  const supabase = await createClient();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const cantidadRaw = String(formData.get("cantidad_stock") ?? "").trim();
  const cantidad_stock = Number(cantidadRaw);

  if (!medicamentoId || cantidadRaw === "" || Number.isNaN(cantidad_stock) || cantidad_stock < 0) {
    return { error: "Ingresá una cantidad de stock válida." };
  }

  const { error } = await supabase
    .from("medicamentos_residente")
    .update({ cantidad_stock, updated_at: new Date().toISOString() })
    .eq("id", medicamentoId);

  if (error) {
    return { error: error.message };
  }

  await recalcularAlertas(supabase, medicamentoId, residenteId, cantidad_stock);

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function reactivarMedicamento(
  residenteId: string,
  medicamentoId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("medicamentos_residente").update({ activo: true }).eq("id", medicamentoId);
  revalidatePath(`/residentes/${residenteId}/legajo`);
}

export type RegistrarIngresoEstado = { error: string | null };

export async function registrarIngreso(
  residenteId: string,
  _estado: RegistrarIngresoEstado,
  formData: FormData,
): Promise<RegistrarIngresoEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const lote = String(formData.get("lote") ?? "").trim() || null;
  const vencimientoRaw = String(formData.get("vencimiento") ?? "").trim();
  const vencimiento = vencimientoRaw || null;
  const entregado_por = String(formData.get("entregado_por") ?? "").trim() || null;

  if (!medicamentoId || !cantidad || cantidad <= 0) {
    return { error: "Completá el medicamento y una cantidad mayor a cero." };
  }

  const { error } = await supabase.from("ingresos_medicamento").insert({
    medicamento_id: medicamentoId,
    residente_id: residenteId,
    cantidad,
    lote,
    vencimiento,
    entregado_por,
    registrado_por: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function eliminarMedicamento(
  residenteId: string,
  medicamentoId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("medicamentos_residente").update({ activo: false }).eq("id", medicamentoId);
  revalidatePath(`/residentes/${residenteId}/legajo`);
}

async function ajustarStockPorDelta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  medicamentoId: string,
  residenteId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;

  const { data: medicamento } = await supabase
    .from("medicamentos_residente")
    .select("cantidad_stock")
    .eq("id", medicamentoId)
    .single<{ cantidad_stock: number }>();

  const nuevoStock = Math.max((medicamento?.cantidad_stock ?? 0) + delta, 0);

  await supabase
    .from("medicamentos_residente")
    .update({ cantidad_stock: nuevoStock, updated_at: new Date().toISOString() })
    .eq("id", medicamentoId);

  await recalcularAlertas(supabase, medicamentoId, residenteId, nuevoStock);
}

export async function actualizarIngreso(
  residenteId: string,
  _estado: RegistrarIngresoEstado,
  formData: FormData,
): Promise<RegistrarIngresoEstado> {
  const supabase = await createClient();

  const ingresoId = String(formData.get("ingreso_id") ?? "");
  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const lote = String(formData.get("lote") ?? "").trim() || null;
  const vencimientoRaw = String(formData.get("vencimiento") ?? "").trim();
  const vencimiento = vencimientoRaw || null;
  const entregado_por = String(formData.get("entregado_por") ?? "").trim() || null;

  if (!ingresoId || !medicamentoId || !cantidad || cantidad <= 0) {
    return { error: "Completá una cantidad mayor a cero." };
  }

  const { data: ingresoActual } = await supabase
    .from("ingresos_medicamento")
    .select("cantidad")
    .eq("id", ingresoId)
    .single<{ cantidad: number }>();

  if (!ingresoActual) {
    return { error: "No se encontró el ingreso." };
  }

  const { error } = await supabase
    .from("ingresos_medicamento")
    .update({ cantidad, lote, vencimiento, entregado_por })
    .eq("id", ingresoId);

  if (error) {
    return { error: error.message };
  }

  await ajustarStockPorDelta(supabase, medicamentoId, residenteId, cantidad - ingresoActual.cantidad);

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function eliminarIngreso(
  residenteId: string,
  ingresoId: string,
  medicamentoId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: ingreso } = await supabase
    .from("ingresos_medicamento")
    .select("cantidad")
    .eq("id", ingresoId)
    .single<{ cantidad: number }>();

  await supabase.from("ingresos_medicamento").delete().eq("id", ingresoId);

  if (ingreso) {
    await ajustarStockPorDelta(supabase, medicamentoId, residenteId, -ingreso.cantidad);
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
}

const UMBRAL_POLIFARMACIA = 5;

export interface AvisoPolifarmacia {
  totalActivos: number;
  esPolifarmacia: boolean;
  duplicados: string[];
}

export async function evaluarPolifarmacia(residenteId: string): Promise<AvisoPolifarmacia> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select("nombre")
    .eq("residente_id", residenteId)
    .eq("activo", true)
    .returns<{ nombre: string }[]>();

  const nombres = (data ?? []).map((m) => m.nombre.trim().toLowerCase());
  const conteo = new Map<string, number>();
  for (const n of nombres) conteo.set(n, (conteo.get(n) ?? 0) + 1);
  const duplicados = [...conteo.entries()].filter(([, c]) => c > 1).map(([n]) => n);

  return {
    totalActivos: nombres.length,
    esPolifarmacia: nombres.length >= UMBRAL_POLIFARMACIA,
    duplicados,
  };
}

export type RegistrarEstadoTomaEstado = { error: string | null };

export async function registrarEstadoToma(
  sucursalId: string,
  _estado: RegistrarEstadoTomaEstado,
  formData: FormData,
): Promise<RegistrarEstadoTomaEstado> {
  const supabase = await createClient();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const residenteId = String(formData.get("residente_id") ?? "");
  const horario = String(formData.get("horario") ?? "");
  const estadoRaw = String(formData.get("estado") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const dosisIdExistente = String(formData.get("dosis_id") ?? "") || null;

  const estado = estadoRaw as EstadoDosis;
  if (!medicamentoId || !residenteId || !horario) {
    return { error: "Faltan datos de la toma." };
  }
  if (!["administrado", "rechazado", "suspendido"].includes(estado)) {
    return { error: "Estado inválido." };
  }
  if (estado !== "administrado" && !motivo) {
    return { error: "Ingresá el motivo." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (dosisIdExistente) {
    const { data: dosisActual } = await supabase
      .from("dosis_administradas")
      .select("cantidad, estado")
      .eq("id", dosisIdExistente)
      .single<{ cantidad: number; estado: EstadoDosis }>();

    const { error } = await supabase
      .from("dosis_administradas")
      .update({ estado, motivo })
      .eq("id", dosisIdExistente);

    if (error) return { error: error.message };

    if (dosisActual) {
      const reversion = dosisActual.estado === "administrado" ? dosisActual.cantidad : 0;
      const aplicacion = estado === "administrado" ? dosisActual.cantidad : 0;
      await ajustarStockPorDelta(supabase, medicamentoId, residenteId, reversion - aplicacion);
    }
  } else {
    const { error } = await supabase.from("dosis_administradas").insert({
      medicamento_id: medicamentoId,
      residente_id: residenteId,
      cantidad: 1,
      estado,
      motivo,
      horario_previsto: horario,
      administrado_por: user?.id ?? null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/medicacion`);
  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export type ActualizarDosisEstado = { error: string | null };

export async function actualizarDosisAdministrada(
  residenteId: string,
  _estado: ActualizarDosisEstado,
  formData: FormData,
): Promise<ActualizarDosisEstado> {
  const supabase = await createClient();

  const dosisId = String(formData.get("dosis_id") ?? "");
  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const estadoRaw = String(formData.get("estado") ?? "administrado");
  const estado: EstadoDosis = estadoRaw === "omitido" ? "omitido" : "administrado";

  if (!dosisId || !medicamentoId || !cantidad || cantidad <= 0) {
    return { error: "Ingresá una cantidad válida." };
  }

  const { data: dosisActual } = await supabase
    .from("dosis_administradas")
    .select("cantidad, estado")
    .eq("id", dosisId)
    .single<{ cantidad: number; estado: EstadoDosis }>();

  if (!dosisActual) {
    return { error: "No se encontró el registro." };
  }

  const { error } = await supabase
    .from("dosis_administradas")
    .update({ cantidad, estado })
    .eq("id", dosisId);

  if (error) {
    return { error: error.message };
  }

  const reversion = dosisActual.estado === "administrado" ? dosisActual.cantidad : 0;
  const aplicacion = estado === "administrado" ? cantidad : 0;

  await ajustarStockPorDelta(supabase, medicamentoId, residenteId, reversion - aplicacion);

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function eliminarDosisAdministrada(
  residenteId: string,
  dosisId: string,
  medicamentoId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: dosis } = await supabase
    .from("dosis_administradas")
    .select("cantidad, estado")
    .eq("id", dosisId)
    .single<{ cantidad: number; estado: EstadoDosis }>();

  await supabase.from("dosis_administradas").delete().eq("id", dosisId);

  if (dosis && dosis.estado === "administrado") {
    await ajustarStockPorDelta(supabase, medicamentoId, residenteId, dosis.cantidad);
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
}
