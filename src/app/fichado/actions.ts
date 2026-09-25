"use server";

import { createClient } from "@/lib/supabase/server";
import type { TipoFichada } from "@/lib/types";

export type EmpleadoFichado = { id: string; nombre_completo: string; proximo: TipoFichada | null };

export async function buscarEmpleadoPorDni(dni: string): Promise<EmpleadoFichado | null> {
  const dniLimpio = dni.trim();
  if (!dniLimpio) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buscar_empleado_fichado", {
    p_dni: dniLimpio,
  });

  const filas = (data ?? null) as { id: string; nombre_completo: string }[] | null;
  if (error || !filas || filas.length === 0) return null;

  // Si la funcion no esta disponible, proximo queda en null y se ofrecen ambas opciones.
  const { data: proximo } = await supabase.rpc("proximo_tipo_fichada", {
    p_empleado_id: filas[0].id,
  });

  return {
    ...filas[0],
    proximo: proximo === "egreso" || proximo === "ingreso" ? proximo : null,
  };
}

export type RegistrarFichadaResultado =
  | { ok: true; tipo: TipoFichada; hora: string }
  | { ok: false; error: string };

export async function registrarFichada(
  empleadoId: string,
  tipo: TipoFichada,
): Promise<RegistrarFichadaResultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_fichada", {
    p_empleado_id: empleadoId,
    p_tipo: tipo,
  });

  const filas = (data ?? null) as { id: string; tipo: TipoFichada; fecha: string; hora: string }[] | null;
  if (error || !filas || filas.length === 0) {
    return { ok: false, error: "No se pudo registrar la fichada. Probá de nuevo." };
  }

  return { ok: true, tipo, hora: filas[0].hora.slice(0, 5) };
}
