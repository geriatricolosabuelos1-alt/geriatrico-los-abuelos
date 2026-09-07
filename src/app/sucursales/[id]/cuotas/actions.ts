"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActualizarArancelEstado = { error: string | null };

export async function actualizarArancel(
  residenteId: string,
  sucursalId: string,
  _estado: ActualizarArancelEstado,
  formData: FormData,
): Promise<ActualizarArancelEstado> {
  const supabase = await createClient();

  const cuotaRaw = String(formData.get("cuota_mensual") ?? "");
  const coberturaRaw = String(formData.get("monto_cobertura_obra_social") ?? "");
  const recargoRaw = String(formData.get("porcentaje_recargo_mora") ?? "");

  const cuota_mensual = cuotaRaw ? Number(cuotaRaw) : null;
  const monto_cobertura_obra_social = coberturaRaw ? Number(coberturaRaw) : null;
  const porcentaje_recargo_mora = recargoRaw ? Number(recargoRaw) : null;

  const { error } = await supabase
    .from("ficha_administrativa")
    .upsert(
      { residente_id: residenteId, cuota_mensual, monto_cobertura_obra_social, porcentaje_recargo_mora },
      { onConflict: "residente_id" },
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/cuotas`);
  return { error: null };
}
