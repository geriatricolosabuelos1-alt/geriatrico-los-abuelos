"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearPagoEstado = { error: string | null };

export async function crearPago(
  sucursalId: string,
  _estado: CrearPagoEstado,
  formData: FormData,
): Promise<CrearPagoEstado> {
  const supabase = await createClient();

  const residente_id = String(formData.get("residente_id") ?? "");
  const monto = Number(formData.get("monto") ?? 0);
  const mes = Number(formData.get("mes") ?? 0);
  const anio = Number(formData.get("anio") ?? 0);

  if (!residente_id || !monto || !mes || !anio) {
    return { error: "Completá residente, monto, mes y año." };
  }

  const { error } = await supabase.from("pagos").insert({
    residente_id,
    sucursal_id: sucursalId,
    monto,
    mes,
    anio,
    estado: "pendiente",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/cuotas`);
  return { error: null };
}

export async function marcarPagado(sucursalId: string, pagoId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("pagos")
    .update({ estado: "pagado", fecha_pago: new Date().toISOString().slice(0, 10) })
    .eq("id", pagoId);

  revalidatePath(`/sucursales/${sucursalId}/cuotas`);
}
