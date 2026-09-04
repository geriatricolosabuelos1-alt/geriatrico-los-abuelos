"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const dni = String(formData.get("dni") ?? "").trim() || null;
  const nacionalidad = String(formData.get("nacionalidad") ?? "").trim() || null;
  const fecha_ingreso = String(formData.get("fecha_ingreso") ?? "") || null;
  const habitacion = String(formData.get("habitacion") ?? "").trim() || null;
  const contacto_familiar = String(formData.get("contacto_familiar") ?? "").trim() || null;
  const telefono_familiar = String(formData.get("telefono_familiar") ?? "").trim() || null;
  const obra_social = String(formData.get("obra_social") ?? "").trim() || null;
  const tipo_cobertura = String(formData.get("tipo_cobertura") ?? "").trim() || null;
  const medico_cabecera = String(formData.get("medico_cabecera") ?? "").trim() || null;
  const grupo_sanguineo = String(formData.get("grupo_sanguineo") ?? "").trim() || null;
  const diagnosticos = String(formData.get("diagnosticos") ?? "").trim() || null;
  const alergias = String(formData.get("alergias") ?? "").trim() || null;

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
      dni,
      nacionalidad,
      fecha_ingreso,
      habitacion,
      contacto_familiar,
      telefono_familiar,
    })
    .select("id")
    .single();

  if (errorResidente || !residente) {
    return { error: errorResidente?.message ?? "No se pudo crear el residente." };
  }

  const { error: errorFichaAdmin } = await supabase.from("ficha_administrativa").insert({
    residente_id: residente.id,
    obra_social,
    tipo_cobertura,
  });

  if (errorFichaAdmin) {
    return { error: errorFichaAdmin.message };
  }

  const { error: errorFichaMedica } = await supabase.from("ficha_medica").insert({
    residente_id: residente.id,
    medico_cabecera,
    grupo_sanguineo,
    diagnosticos,
    alergias,
  });

  if (errorFichaMedica) {
    return { error: errorFichaMedica.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/residentes`);
  redirect(`/residentes/${residente.id}/legajo`);
}

export type ActualizarResidenteEstado = { error: string | null };

export async function actualizarResidente(
  sucursalId: string,
  residenteId: string,
  _estado: ActualizarResidenteEstado,
  formData: FormData,
): Promise<ActualizarResidenteEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const fecha_nacimiento = String(formData.get("fecha_nacimiento") ?? "") || null;
  const fecha_ingreso = String(formData.get("fecha_ingreso") ?? "") || null;
  const fecha_egreso = String(formData.get("fecha_egreso") ?? "") || null;
  const contacto_familiar = String(formData.get("contacto_familiar") ?? "") || null;
  const telefono_familiar = String(formData.get("telefono_familiar") ?? "") || null;
  const obra_social = String(formData.get("obra_social") ?? "") || null;
  const tipo_cobertura = String(formData.get("tipo_cobertura") ?? "") || null;
  const cuotaRaw = String(formData.get("cuota_mensual") ?? "");
  const cuota_mensual = cuotaRaw ? Number(cuotaRaw) : null;
  const activo = formData.get("activo") === "on";

  if (!nombre || !apellido) {
    return { error: "Nombre y apellido son obligatorios." };
  }

  const { error: errorResidente } = await supabase
    .from("residentes")
    .update({
      nombre,
      apellido,
      fecha_nacimiento,
      fecha_ingreso,
      fecha_egreso,
      contacto_familiar,
      telefono_familiar,
      activo,
    })
    .eq("id", residenteId);

  if (errorResidente) {
    return { error: errorResidente.message };
  }

  const { error: errorFicha } = await supabase
    .from("ficha_administrativa")
    .upsert(
      { residente_id: residenteId, obra_social, tipo_cobertura, cuota_mensual },
      { onConflict: "residente_id" },
    );

  if (errorFicha) {
    return { error: errorFicha.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/residentes`);
  return { error: null };
}

export async function eliminarResidente(sucursalId: string, residenteId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("residentes").delete().eq("id", residenteId);
  revalidatePath(`/sucursales/${sucursalId}/residentes`);
}
