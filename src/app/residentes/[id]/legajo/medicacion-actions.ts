"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MedicamentoResidente } from "@/lib/types";

export async function listarMedicamentos(residenteId: string): Promise<MedicamentoResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("medicamentos_residente")
    .select("id, residente_id, nombre, dosis, cantidad_stock, notas, updated_at")
    .eq("residente_id", residenteId)
    .order("nombre")
    .returns<MedicamentoResidente[]>();

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

  if (!nombre) {
    return { error: "El nombre del medicamento es obligatorio." };
  }

  const { error } = await supabase.from("medicamentos_residente").insert({
    residente_id: residenteId,
    nombre,
    dosis,
    cantidad_stock,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  return { error: null };
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
