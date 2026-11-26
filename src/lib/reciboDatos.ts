import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hoyArgentina } from "@/lib/fechas";

export type TipoPagoRecibo = "obra_social" | "paciente";

export type DatosRecibo = {
  sedeNombre: string;
  sedeDireccion: string | null;
  numero: string;
  emitido: string;
  residenteNombre: string;
  residenteDni: string | null;
  mes: number;
  anio: number;
  tipoPago: TipoPagoRecibo;
  importe: number;
};

// Recibo de pago de un residente (se lee con la sesión del usuario: sin permiso, devuelve null).
export async function datosRecibo(residenteId: string, pagoId: string): Promise<DatosRecibo | null> {
  const supabase = await createClient();
  const { data: residente } = await supabase
    .from("residentes")
    .select("nombre, apellido, dni, sucursal_id")
    .eq("id", residenteId)
    .single<{ nombre: string; apellido: string; dni: string | null; sucursal_id: string }>();
  if (!residente) return null;

  const [{ data: sucursal }, { data: pago }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("nombre, direccion")
      .eq("id", residente.sucursal_id)
      .single<{ nombre: string; direccion: string | null }>(),
    supabase
      .from("pagos")
      .select("id, monto, monto_pagado, mes, anio, tipo_pago")
      .eq("id", pagoId)
      .eq("residente_id", residenteId)
      .single<{ id: string; monto: number; monto_pagado: number; mes: number; anio: number; tipo_pago: TipoPagoRecibo }>(),
  ]);
  if (!pago) return null;

  const ahora = new Date();
  return {
    sedeNombre: sucursal?.nombre ?? "",
    sedeDireccion: sucursal?.direccion ?? null,
    numero: `${hoyArgentina().replace(/-/g, "")}-${pago.id.slice(0, 8).toUpperCase()}`,
    emitido: `${ahora.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" })} · ${ahora.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Mendoza" })}`,
    residenteNombre: `${residente.apellido}, ${residente.nombre}`,
    residenteDni: residente.dni,
    mes: pago.mes,
    anio: pago.anio,
    tipoPago: pago.tipo_pago,
    importe: Number(pago.monto_pagado > 0 ? pago.monto_pagado : pago.monto),
  };
}
