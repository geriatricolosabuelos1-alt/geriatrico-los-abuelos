"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Estado = { error: string | null };

const ROLES_LEGALES = ["admin", "gerente_sede", "administrativo"];

async function puedeGestionar(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single<{ rol: string }>();
  return perfil && ROLES_LEGALES.includes(perfil.rol) ? user.id : null;
}

function revalidar(sucursalId: string) {
  revalidatePath(`/sucursales/${sucursalId}/legales/certificaciones`);
  revalidatePath(`/sucursales/${sucursalId}/legales/emergencias`);
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

  const userId = await puedeGestionar(supabase);
  if (!userId) return { error: "Solo administración puede registrar llamadas de emergencia." };

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
    registrado_por: userId,
  });

  if (error) return { error: error.message };
  revalidar(sucursalId);
  return { error: null };
}

export async function eliminarEmergencia(sucursalId: string, emergenciaId: string): Promise<void> {
  const supabase = await createClient();
  if (!(await puedeGestionar(supabase))) return;
  await supabase.from("emergencias").delete().eq("id", emergenciaId);
  revalidar(sucursalId);
}
