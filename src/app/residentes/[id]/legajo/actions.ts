"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActualizarLegajoEstado = { error: string | null };

export async function actualizarLegajo(
  residenteId: string,
  sucursalId: string,
  _estado: ActualizarLegajoEstado,
  formData: FormData,
): Promise<ActualizarLegajoEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellido = String(formData.get("apellido") ?? "").trim();
  const fecha_nacimiento = String(formData.get("fecha_nacimiento") ?? "") || null;
  const dni = String(formData.get("dni") ?? "").trim() || null;
  const nacionalidad = String(formData.get("nacionalidad") ?? "").trim() || null;
  const fecha_ingreso = String(formData.get("fecha_ingreso") ?? "") || null;
  const fecha_egreso = String(formData.get("fecha_egreso") ?? "") || null;
  const habitacion = String(formData.get("habitacion") ?? "").trim() || null;
  const nivel_cuidado = String(formData.get("nivel_cuidado") ?? "").trim() || null;
  const activo = formData.get("activo") === "on";
  const contacto_familiar = String(formData.get("contacto_familiar") ?? "").trim() || null;
  const telefono_familiar = String(formData.get("telefono_familiar") ?? "").trim() || null;

  const obra_social = String(formData.get("obra_social") ?? "").trim() || null;
  const tipo_cobertura = String(formData.get("tipo_cobertura") ?? "").trim() || null;
  const fecha_vencimiento_cuota = String(formData.get("fecha_vencimiento_cuota") ?? "") || null;
  const mecanismo_actualizacion =
    String(formData.get("mecanismo_actualizacion") ?? "").trim() || null;
  const cud_vencimiento = String(formData.get("cud_vencimiento") ?? "") || null;

  const medico_cabecera = String(formData.get("medico_cabecera") ?? "").trim() || null;
  const grupo_sanguineo = String(formData.get("grupo_sanguineo") ?? "").trim() || null;
  const diagnosticos = String(formData.get("diagnosticos") ?? "").trim() || null;
  const alergias = String(formData.get("alergias") ?? "").trim() || null;

  if (!nombre || !apellido) {
    return { error: "Nombre y apellido son obligatorios." };
  }

  const { error: errorResidente } = await supabase
    .from("residentes")
    .update({
      nombre,
      apellido,
      fecha_nacimiento,
      dni,
      nacionalidad,
      fecha_ingreso,
      fecha_egreso,
      habitacion,
      nivel_cuidado,
      activo,
      contacto_familiar,
      telefono_familiar,
    })
    .eq("id", residenteId);

  if (errorResidente) {
    return { error: errorResidente.message };
  }

  const { error: errorFichaAdmin } = await supabase
    .from("ficha_administrativa")
    .upsert(
      {
        residente_id: residenteId,
        obra_social,
        tipo_cobertura,
        fecha_vencimiento_cuota,
        mecanismo_actualizacion,
        cud_vencimiento,
      },
      { onConflict: "residente_id" },
    );

  if (errorFichaAdmin) {
    return { error: errorFichaAdmin.message };
  }

  const { error: errorFichaMedica } = await supabase
    .from("ficha_medica")
    .upsert(
      { residente_id: residenteId, medico_cabecera, grupo_sanguineo, diagnosticos, alergias },
      { onConflict: "residente_id" },
    );

  if (errorFichaMedica) {
    return { error: errorFichaMedica.message };
  }

  revalidatePath(`/residentes/${residenteId}/legajo`);
  revalidatePath(`/sucursales/${sucursalId}/residentes`);
  return { error: null };
}
