"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearPagoEstado = { error: string | null };

export async function crearPago(
  residenteId: string,
  sucursalId: string,
  _estado: CrearPagoEstado,
  formData: FormData,
): Promise<CrearPagoEstado> {
  const supabase = await createClient();

  const montoObraSocial = Number(formData.get("monto_obra_social") ?? 0);
  const montoPaciente = Number(formData.get("monto_paciente") ?? 0);
  const mes = Number(formData.get("mes") ?? 0);
  const anio = Number(formData.get("anio") ?? 0);

  if ((!montoObraSocial && !montoPaciente) || !mes || !anio) {
    return { error: "Completá al menos un monto, mes y año." };
  }

  const filas = [];
  if (montoObraSocial > 0) {
    filas.push({
      residente_id: residenteId,
      sucursal_id: sucursalId,
      monto: montoObraSocial,
      mes,
      anio,
      estado: "pendiente" as const,
      tipo_pago: "obra_social" as const,
    });
  }
  if (montoPaciente > 0) {
    filas.push({
      residente_id: residenteId,
      sucursal_id: sucursalId,
      monto: montoPaciente,
      mes,
      anio,
      estado: "pendiente" as const,
      tipo_pago: "paciente" as const,
    });
  }

  const { error } = await supabase.from("pagos").insert(filas);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
  return { error: null };
}

export async function marcarPagado(
  residenteId: string,
  pagoId: string,
  fechaPago: string,
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pagos")
    .update({ estado: "pagado", fecha_pago: fechaPago || new Date().toISOString().slice(0, 10) })
    .eq("id", pagoId);

  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
}

export async function eliminarPago(residenteId: string, pagoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pagos").delete().eq("id", pagoId);
  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
}
