"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoVacuna, VacunacionResidente } from "@/lib/types";

type Estado = { error: string | null };

function rutaVacunacion(sucursalId: string): string {
  return `/sucursales/${sucursalId}/medicacion/vacunacion`;
}

export type DatosResidenteVacunacion = {
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  sucursal_id: string;
  ficha_administrativa: { obra_social: string | null; numero_afiliado: string | null } | null;
};

export type VacunacionConResidente = VacunacionResidente & {
  residente_nombre: string;
  residentes: DatosResidenteVacunacion;
};

export async function listarVacunacionesSucursal(sucursalId: string): Promise<VacunacionConResidente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacunaciones_residente")
    .select(
      "id, residente_id, vacuna, vacuna_otra, fecha_aplicacion, dosis_numero, proxima_dosis, registrado_por, created_at, residentes!inner(nombre, apellido, dni, fecha_nacimiento, sucursal_id, ficha_administrativa(obra_social, numero_afiliado))",
    )
    .eq("residentes.sucursal_id", sucursalId)
    .order("fecha_aplicacion", { ascending: false })
    .returns<(VacunacionResidente & { residentes: DatosResidenteVacunacion })[]>();

  return (data ?? []).map((v) => ({ ...v, residente_nombre: `${v.residentes.apellido}, ${v.residentes.nombre}` }));
}

export async function agregarVacunacion(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const residente_id = String(formData.get("residente_id") ?? "");
  const vacuna = String(formData.get("vacuna") ?? "") as TipoVacuna;
  const vacuna_otra = String(formData.get("vacuna_otra") ?? "").trim() || null;
  const fecha_aplicacion = String(formData.get("fecha_aplicacion") ?? "").trim();
  const dosisRaw = String(formData.get("dosis_numero") ?? "").trim();
  const dosis_numero = dosisRaw ? Number(dosisRaw) : null;
  const proxima_dosis = String(formData.get("proxima_dosis") ?? "").trim() || null;

  if (!residente_id || !vacuna || !fecha_aplicacion) {
    return { error: "Completá residente, vacuna y fecha de aplicación." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("vacunaciones_residente").insert({
    residente_id,
    vacuna,
    vacuna_otra,
    fecha_aplicacion,
    dosis_numero,
    proxima_dosis,
    registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaVacunacion(sucursalId));
  return { error: null };
}

export async function eliminarVacunacion(sucursalId: string, id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("vacunaciones_residente").delete().eq("id", id);
  revalidatePath(rutaVacunacion(sucursalId));
}
