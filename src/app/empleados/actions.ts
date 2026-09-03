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
  const dni = String(formData.get("dni") ?? "").trim() || null;
  const fecha_nacimiento = String(formData.get("fecha_nacimiento") ?? "") || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const tipo_contratacion = String(formData.get("tipo_contratacion") ?? "") || null;
  const forma_pago = String(formData.get("forma_pago") ?? "") || null;
  const turno = String(formData.get("turno") ?? "") || null;
  const sueldoRaw = String(formData.get("sueldo") ?? "");
  const sueldo = sueldoRaw ? Number(sueldoRaw) : null;

  if (!sucursal_id || !nombre_completo) {
    return { error: "Sucursal y nombre son obligatorios." };
  }

  const { error } = await supabase.from("empleados").insert({
    sucursal_id,
    nombre_completo,
    dni,
    fecha_nacimiento,
    direccion,
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
