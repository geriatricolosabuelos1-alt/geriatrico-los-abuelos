"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type GuardarItemEstado = { error: string | null };

export async function guardarItemInventario(
  sucursalId: string,
  _estado: GuardarItemEstado,
  formData: FormData,
): Promise<GuardarItemEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const item = String(formData.get("item") ?? "").trim();
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const unidad = String(formData.get("unidad") ?? "unidades").trim() || "unidades";

  if (!item || Number.isNaN(cantidad)) {
    return { error: "Completá el ítem y la cantidad." };
  }

  const { error } = await supabase.from("inventario").upsert(
    {
      sucursal_id: sucursalId,
      item,
      cantidad,
      unidad,
      actualizado_por: user?.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "sucursal_id,item" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null };
}
