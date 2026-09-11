"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EstadoDosis } from "@/lib/types";

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
  const estadoRaw = String(formData.get("estado") ?? "administrado");
  const estado: EstadoDosis = estadoRaw === "omitido" ? "omitido" : "administrado";

  if (!medicamentoId || !residenteId || !cantidad || cantidad <= 0) {
    return { error: "Datos inválidos para registrar la dosis." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El stock se descuenta automáticamente vía trigger (trg_dosis_administrada_efecto)
  // cuando estado = 'administrado'. Las dosis omitidas quedan registradas sin tocar stock.
  const { error } = await supabase.from("dosis_administradas").insert({
    medicamento_id: medicamentoId,
    residente_id: residenteId,
    cantidad,
    estado,
    administrado_por: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/medicacion`);
  revalidatePath(`/sucursales/${sucursalId}/medicacion/informe`);
  return { error: null };
}
