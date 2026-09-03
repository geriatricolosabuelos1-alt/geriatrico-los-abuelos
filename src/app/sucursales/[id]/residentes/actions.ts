"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearResidenteEstado = { error: string | null };

export async function crearResidente(
  sucursalId: string,
  _estado: CrearResidenteEstado,
  formData: FormData,
): Promise<CrearResidenteEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const fecha_nacimiento = String(formData.get("fecha_nacimiento") ?? "") || null;
  const contacto_familiar = String(formData.get("contacto_familiar") ?? "") || null;
  const telefono_familiar = String(formData.get("telefono_familiar") ?? "") || null;
  const obra_social = String(formData.get("obra_social") ?? "") || null;
  const tipo_cobertura = String(formData.get("tipo_cobertura") ?? "") || null;
  const cuotaRaw = String(formData.get("cuota_mensual") ?? "");
  const cuota_mensual = cuotaRaw ? Number(cuotaRaw) : null;

  if (!nombre || !apellido) {
    return { error: "Nombre y apellido son obligatorios." };
  }

  const { data: residente, error: errorResidente } = await supabase
    .from("residentes")
    .insert({
      sucursal_id: sucursalId,
      nombre,
      apellido,
      fecha_nacimiento,
      contacto_familiar,
      telefono_familiar,
    })
    .select("id")
    .single();

  if (errorResidente || !residente) {
    return { error: errorResidente?.message ?? "No se pudo crear el residente." };
  }

  const { error: errorFicha } = await supabase.from("ficha_administrativa").insert({
    residente_id: residente.id,
    obra_social,
    tipo_cobertura,
    cuota_mensual,
  });

  if (errorFicha) {
    return { error: errorFicha.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/residentes`);
  return { error: null };
}
