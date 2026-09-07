"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegistrarPagoEstado = { error: string | null };

export async function registrarPago(
  residenteId: string,
  pagoId: string,
  _estado: RegistrarPagoEstado,
  formData: FormData,
): Promise<RegistrarPagoEstado> {
  const supabase = await createClient();

  const monto = Number(formData.get("monto") ?? 0);
  const fecha = String(formData.get("fecha") || new Date().toISOString().slice(0, 10));
  const metodoPago = String(formData.get("metodo_pago") || "efectivo");

  if (!monto || monto <= 0) {
    return { error: "Ingresá un monto mayor a cero." };
  }

  const { data: pago, error: errorConsulta } = await supabase
    .from("pagos")
    .select("monto, monto_pagado")
    .eq("id", pagoId)
    .single<{ monto: number; monto_pagado: number }>();

  if (errorConsulta || !pago) {
    return { error: errorConsulta?.message ?? "No se encontró el pago." };
  }

  const nuevoMontoPagado = Math.min(pago.monto_pagado + monto, pago.monto);
  const nuevoEstado = nuevoMontoPagado >= pago.monto ? "pagado" : "parcial";
  const montoRegistrado = nuevoMontoPagado - pago.monto_pagado;

  const { error } = await supabase
    .from("pagos")
    .update({ monto_pagado: nuevoMontoPagado, estado: nuevoEstado, fecha_pago: fecha })
    .eq("id", pagoId);

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("pagos_historial")
    .insert({ pago_id: pagoId, monto: montoRegistrado, fecha, metodo_pago: metodoPago });

  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
  return { error: null };
}

export async function eliminarPago(residenteId: string, pagoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("pagos").delete().eq("id", pagoId);
  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
}
