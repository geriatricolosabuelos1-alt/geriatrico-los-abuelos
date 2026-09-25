"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Estado = { error: string | null };

function ruta(sucursalId: string): string {
  return `/sucursales/${sucursalId}/emergencias`;
}

export async function registrarEmergencia(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const fecha = String(formData.get("fecha") ?? "").trim();
  const prestador = String(formData.get("prestador") ?? "").trim();
  const satisfactoriaRaw = String(formData.get("satisfactoria") ?? "");
  const demoraRaw = String(formData.get("demora_minutos") ?? "").trim();

  if (!fecha || !prestador) return { error: "Completá la fecha y el prestador." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("emergencias").insert({
    sucursal_id: sucursalId,
    residente_id: String(formData.get("residente_id") ?? "") || null,
    fecha,
    hora: String(formData.get("hora") ?? "").trim() || null,
    prestador,
    motivo: String(formData.get("motivo") ?? "").trim() || null,
    demora_minutos: demoraRaw ? Math.max(0, Math.round(Number(demoraRaw))) : null,
    traslado: formData.get("traslado") === "on",
    satisfactoria: satisfactoriaRaw === "si" ? true : satisfactoriaRaw === "no" ? false : null,
    observaciones: String(formData.get("observaciones") ?? "").trim() || null,
    registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath(ruta(sucursalId));
  return { error: null };
}

export async function eliminarEmergencia(sucursalId: string, emergenciaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("emergencias").delete().eq("id", emergenciaId);
  revalidatePath(ruta(sucursalId));
}
