"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ROLES_CONTRATO = ["admin", "gerente_sede", "administrativo"];

type Resultado = { error: string | null };

async function usuarioConPermiso(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: string }>();

  return perfil && ROLES_CONTRATO.includes(perfil.rol) ? user.id : null;
}

export async function guardarContratoEditado(
  residenteId: string,
  parrafos: string[],
): Promise<Resultado> {
  const supabase = await createClient();
  const userId = await usuarioConPermiso(supabase);
  if (!userId) return { error: "Solo administración puede editar el contrato." };

  const limpios = parrafos.map((p) => p.trim()).filter(Boolean);
  if (limpios.length === 0) return { error: "El contrato no puede quedar vacío." };

  const { error } = await supabase.from("contratos_editados").upsert({
    residente_id: residenteId,
    parrafos: limpios,
    editado_por: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath(`/residentes/${residenteId}/contrato`);
  return { error: null };
}

export async function restaurarContratoOriginal(residenteId: string): Promise<Resultado> {
  const supabase = await createClient();
  if (!(await usuarioConPermiso(supabase))) {
    return { error: "Solo administración puede editar el contrato." };
  }

  const { error } = await supabase.from("contratos_editados").delete().eq("residente_id", residenteId);
  if (error) return { error: error.message };

  revalidatePath(`/residentes/${residenteId}/contrato`);
  return { error: null };
}
