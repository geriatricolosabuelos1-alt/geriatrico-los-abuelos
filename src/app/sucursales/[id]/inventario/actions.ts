"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegistrarMovimientoEstado = { error: string | null };

export async function registrarMovimiento(
  sucursalId: string,
  _estado: RegistrarMovimientoEstado,
  formData: FormData,
): Promise<RegistrarMovimientoEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insumo_id = String(formData.get("insumo_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);

  if (!insumo_id || (tipo !== "entrada" && tipo !== "salida") || !cantidad || cantidad <= 0) {
    return { error: "Completá insumo, tipo y una cantidad mayor a cero." };
  }

  const { error } = await supabase.from("movimientos_inventario").insert({
    sucursal_id: sucursalId,
    insumo_id,
    tipo,
    cantidad,
    registrado_por: user?.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null };
}
