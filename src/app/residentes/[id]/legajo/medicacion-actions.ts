"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  AlertaMedicacion,
  CatalogoMedicamento,
  DosisAdministrada,
  EstadoDosis,
  IngresoMedicamento,
  MedicamentoResidente,
  NivelAlertaMedicacion,
} from "@/lib/types";

export async function listarMedicamentos(residenteId: string): Promise<MedicamentoResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select(
      "id, residente_id, nombre, dosis, dosis_diaria, frecuencia, horario, instrucciones, cantidad_stock, notas, activo, updated_at",
    )
    .eq("residente_id", residenteId)
    .order("nombre")
    .returns<MedicamentoResidente[]>();

  return data ?? [];
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
    .select("id, medicamento_id, residente_id, cantidad, estado, administrado_por, fecha")
    .eq("medicamento_id", medicamentoId)
    .order("fecha", { ascending: false })
    .returns<DosisAdministrada[]>();

  return data ?? [];
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
    .select("id, nombre, dosis")
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
