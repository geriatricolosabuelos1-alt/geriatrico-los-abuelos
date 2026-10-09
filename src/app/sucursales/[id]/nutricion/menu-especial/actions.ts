"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  MENU_ESPECIAL_BASE,
  TIPOS_MENU_ESPECIAL,
  type ContenidoMenuEspecial,
  type MenuEspecial,
  type PacienteMenuEspecial,
  type TipoMenuEspecial,
} from "@/lib/menuEspecial";

// Las dos fichas de la sede: lo guardado o, si todavía no se tocó, el contenido base.
export async function obtenerMenusEspeciales(sucursalId: string): Promise<MenuEspecial[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("menus_especiales")
    .select("tipo, contenido, pacientes, updated_at")
    .eq("sucursal_id", sucursalId)
    .returns<MenuEspecial[]>();
  return TIPOS_MENU_ESPECIAL.map(
    (tipo) =>
      (data ?? []).find((m) => m.tipo === tipo) ?? {
        tipo,
        contenido: MENU_ESPECIAL_BASE[tipo],
        pacientes: [],
        updated_at: null,
      },
  );
}

export async function guardarMenuEspecial(
  sucursalId: string,
  tipo: TipoMenuEspecial,
  contenido: ContenidoMenuEspecial,
  pacientes: PacienteMenuEspecial[],
): Promise<{ error: string | null }> {
  if (!TIPOS_MENU_ESPECIAL.includes(tipo)) return { error: "Tipo de menú inválido." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("menus_especiales")
    .upsert(
      {
        sucursal_id: sucursalId,
        tipo,
        contenido,
        pacientes,
        actualizado_por: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "sucursal_id,tipo" },
    )
    .select("id");

  if (error) {
    return {
      error: /menus_especiales/.test(error.message)
        ? "Falta crear la tabla de menús especiales en la base (avisale a quien administra el sistema)."
        : error.message,
    };
  }
  if (!data || data.length === 0) return { error: "No tenés permiso para modificar esta ficha." };

  revalidatePath(`/sucursales/${sucursalId}/nutricion/menu-especial`);
  return { error: null };
}
