"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdministrarDosisEstado = { error: string | null };

export async function administrarDosis(
  sucursalId: string,
  _estado: AdministrarDosisEstado,
  formData: FormData,
): Promise<AdministrarDosisEstado> {
  const supabase = await createClient();

  const medicamentoId = String(formData.get("medicamento_id") ?? "");
  const residenteId = String(formData.get("residente_id") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 1);

  if (!medicamentoId || !residenteId || !cantidad || cantidad <= 0) {
    return { error: "Datos inválidos para registrar la dosis." };
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

  const nuevoStock = Math.max(medicamento.cantidad_stock - cantidad, 0);

  const { error: errorUpdate } = await supabase
    .from("medicamentos_residente")
    .update({ cantidad_stock: nuevoStock, updated_at: new Date().toISOString() })
    .eq("id", medicamentoId);

  if (errorUpdate) {
    return { error: errorUpdate.message };
  }

  const { error: errorInsert } = await supabase.from("dosis_administradas").insert({
    medicamento_id: medicamentoId,
    residente_id: residenteId,
    cantidad,
    administrado_por: user?.id ?? null,
  });

  if (errorInsert) {
    return { error: errorInsert.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/medicacion`);
  revalidatePath(`/sucursales/${sucursalId}/medicacion/informe`);
  return { error: null };
}
