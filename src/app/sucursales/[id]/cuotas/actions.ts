"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generarPeriodoParaSucursal, type ResultadoGeneracion } from "@/lib/generarPeriodo";

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
  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
  return { error: null };
}

export type GenerarPeriodoEstado = ResultadoGeneracion & { error: string | null };

export async function generarPeriodoDelMes(
  sucursalId: string,
  _estado: GenerarPeriodoEstado,
  formData: FormData,
): Promise<GenerarPeriodoEstado> {
  const supabase = await createClient();

  const mesAnio = String(formData.get("mes_anio") ?? "");
  const [anioStr, mesStr] = mesAnio.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);

  if (!anio || !mes) {
    return { error: "Elegí un mes válido.", generados: 0, omitidos: 0 };
  }

  const resultado = await generarPeriodoParaSucursal(supabase, sucursalId, mes, anio);

  revalidatePath(`/sucursales/${sucursalId}/cuotas`);
  return { error: null, ...resultado };
}
