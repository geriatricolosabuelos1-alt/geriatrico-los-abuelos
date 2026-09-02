"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearEmpleadoEstado = { error: string | null };

export async function crearEmpleado(
  _estado: CrearEmpleadoEstado,
  formData: FormData,
): Promise<CrearEmpleadoEstado> {
  const supabase = await createClient();

  const sucursal_id = String(formData.get("sucursal_id") ?? "");
  const nombre_completo = String(formData.get("nombre_completo") ?? "").trim();
  const tipo_contratacion = String(formData.get("tipo_contratacion") ?? "");
  const forma_pago = String(formData.get("forma_pago") ?? "");
  const turno = String(formData.get("turno") ?? "") || null;
  const sueldoRaw = String(formData.get("sueldo") ?? "");
  const sueldo = sueldoRaw ? Number(sueldoRaw) : null;

  if (!sucursal_id || !nombre_completo || !tipo_contratacion || !forma_pago) {
    return { error: "Sucursal, nombre, tipo de contratación y forma de pago son obligatorios." };
  }

  const { error } = await supabase.from("empleados").insert({
    sucursal_id,
    nombre_completo,
    tipo_contratacion,
    forma_pago,
    turno,
    sueldo,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/empleados");
  return { error: null };
}
