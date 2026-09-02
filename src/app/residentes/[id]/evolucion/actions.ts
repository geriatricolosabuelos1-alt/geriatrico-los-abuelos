"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RolUsuario, TipoNotaEvolucion } from "@/lib/types";

export type CrearNotaEstado = { error: string | null };

const TIPO_POR_ROL: Partial<Record<RolUsuario, TipoNotaEvolucion>> = {
  medico: "medica",
  enfermero: "enfermeria",
  cuidador: "enfermeria",
  nutricionista: "nutricion",
  kinesiologo: "kinesiologia",
};

export async function crearNotaEvolucion(
  residenteId: string,
  _estado: CrearNotaEstado,
  formData: FormData,
): Promise<CrearNotaEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: RolUsuario }>();

  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) {
    return { error: "La nota no puede estar vacía." };
  }

  let tipo: TipoNotaEvolucion | undefined;
  if (perfil?.rol === "admin") {
    tipo = String(formData.get("tipo") ?? "") as TipoNotaEvolucion;
  } else {
    tipo = perfil?.rol ? TIPO_POR_ROL[perfil.rol] : undefined;
  }

  if (!tipo) {
    return { error: "Tu rol no tiene permiso para cargar notas de evolución." };
  }

  const { error } = await supabase.from("notas_evolucion").insert({
    residente_id: residenteId,
    autor_id: user.id,
    tipo,
    contenido,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/residentes/${residenteId}/evolucion`);
  return { error: null };
}
