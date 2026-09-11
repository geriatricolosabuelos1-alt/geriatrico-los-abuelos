"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { IngresoMedicamento, MedicamentoResidente } from "@/lib/types";

export async function listarMedicamentos(residenteId: string): Promise<MedicamentoResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select(
      "id, residente_id, nombre, dosis, cantidad_stock, notas, updated_at, dosis_diaria, frecuencia, horario, instrucciones, activo",
    )
    .eq("residente_id", residenteId)
    .order("nombre")
    .returns<MedicamentoResidente[]>();

  return data ?? [];
}

export async function listarIngresos(medicamentoId: string): Promise<IngresoMedicamento[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ingresos_medicamento")
    .select(
      "id, medicamento_id, residente_id, fecha, cantidad, lote, vencimiento, entregado_por, registrado_por, created_at",
    )
    .eq("medicamento_id", medicamentoId)
    .order("fecha", { ascending: false })
    .returns<IngresoMedicamento[]>();

  return data ?? [];
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
  const cantidad_stock = Number(formData.get("cantidad_stock") ?? 0);
  const dosis_diaria_raw = String(formData.get("dosis_diaria") ?? "").trim();
  const dosis_diaria = dosis_diaria_raw ? Number(dosis_diaria_raw) : null;
  const frecuencia = String(formData.get("frecuencia") ?? "").trim() || null;
  const horario = String(formData.get("horario") ?? "").trim() || null;
  const instrucciones = String(formData.get("instrucciones") ?? "").trim() || null;

  if (!nombre) {
    return { error: "El nombre del medicamento es obligatorio." };
  }

  const { error } = await supabase.from("medicamentos_residente").insert({
    residente_id: residenteId,
    nombre,
    dosis,
    cantidad_stock,
    dosis_diaria,
    frecuencia,
    horario,
    instrucciones,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}

export async function actualizarPrescripcion(
  residenteId: string,
  medicamentoId: string,
  datos: {
    dosis: string | null;
    dosis_diaria: number | null;
    frecuencia: string | null;
    horario: string | null;
    instrucciones: string | null;
    activo: boolean;
  },
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("medicamentos_residente")
    .update({ ...datos, updated_at: new Date().toISOString() })
    .eq("id", medicamentoId);
  revalidatePath(`/residentes/${residenteId}/legajo`);
}

export async function actualizarStockMedicamento(
  residenteId: string,
  medicamentoId: string,
  cantidad_stock: number,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("medicamentos_residente")
    .update({ cantidad_stock, updated_at: new Date().toISOString() })
    .eq("id", medicamentoId);
  revalidatePath(`/residentes/${residenteId}/legajo`);
}

export async function eliminarMedicamento(
  residenteId: string,
  medicamentoId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("medicamentos_residente").delete().eq("id", medicamentoId);
  revalidatePath(`/residentes/${residenteId}/legajo`);
}

export type RegistrarIngresoEstado = { error: string | null };

export async function registrarIngreso(
  residenteId: string,
  medicamentoId: string,
  _estado: RegistrarIngresoEstado,
  formData: FormData,
): Promise<RegistrarIngresoEstado> {
  const supabase = await createClient();

  const cantidad = Number(formData.get("cantidad") ?? 0);
  const fecha = String(formData.get("fecha") ?? "") || new Date().toISOString().slice(0, 10);
  const lote = String(formData.get("lote") ?? "").trim() || null;
  const vencimiento = String(formData.get("vencimiento") ?? "") || null;
  const entregado_por = String(formData.get("entregado_por") ?? "").trim() || null;

  if (!cantidad || cantidad <= 0) {
    return { error: "La cantidad ingresada debe ser mayor a cero." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: medicamento } = await supabase
    .from("medicamentos_residente")
    .select("cantidad_stock")
    .eq("id", medicamentoId)
    .single<{ cantidad_stock: number }>();

  if (!medicamento) {
    return { error: "No se encontró el medicamento." };
  }

  const { error: errorInsert } = await supabase.from("ingresos_medicamento").insert({
    medicamento_id: medicamentoId,
    residente_id: residenteId,
    fecha,
    cantidad,
    lote,
    vencimiento,
    entregado_por,
    registrado_por: user?.id ?? null,
  });

  if (errorInsert) {
    return { error: errorInsert.message };
  }

  const { error: errorUpdate } = await supabase
    .from("medicamentos_residente")
    .update({
      cantidad_stock: medicamento.cantidad_stock + cantidad,
      updated_at: new Date().toISOString(),
    })
    .eq("id", medicamentoId);

  if (errorUpdate) {
    return { error: errorUpdate.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
}
