"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DiaSemana, TurnoProgramado } from "@/lib/types";

export async function listarTurnosProgramados(sucursalId: string): Promise<TurnoProgramado[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("turnos_programados")
    .select(
      "id, empleado_id, sucursal_id, dia_semana, hora_inicio, hora_fin, vigente_desde, vigente_hasta, activo, created_at",
    )
    .eq("sucursal_id", sucursalId)
    .eq("activo", true)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true })
    .returns<TurnoProgramado[]>();

  return data ?? [];
}

export type CrearTurnoProgramaEstado = { error: string | null };

export async function crearTurnoPrograma(
  _estado: CrearTurnoProgramaEstado,
  formData: FormData,
): Promise<CrearTurnoProgramaEstado> {
  const supabase = await createClient();

  const empleado_id = String(formData.get("empleado_id") ?? "");
  const sucursal_id = String(formData.get("sucursal_id") ?? "");
  const hora_inicio = String(formData.get("hora_inicio") ?? "");
  const hora_fin = String(formData.get("hora_fin") ?? "");
  const vigente_desde = String(formData.get("vigente_desde") ?? "");
  const vigente_hasta = String(formData.get("vigente_hasta") ?? "");
  const dias = formData.getAll("dias").map((d) => Number(d)) as DiaSemana[];

  if (!empleado_id || !sucursal_id || !hora_inicio || !hora_fin || !vigente_desde || !vigente_hasta) {
    return { error: "Completá empleado, horario y vigencia." };
  }
  if (dias.length === 0) {
    return { error: "Elegí al menos un día de la semana." };
  }

  const filas = dias.map((dia_semana) => ({
    empleado_id,
    sucursal_id,
    dia_semana,
    hora_inicio,
    hora_fin,
    vigente_desde,
    vigente_hasta,
  }));

  const { error } = await supabase.from("turnos_programados").insert(filas);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/empleados/turnos");
  return { error: null };
}

export type ActualizarTurnoProgramaEstado = { error: string | null };

export async function actualizarTurnoPrograma(
  id: string,
  formData: FormData,
): Promise<ActualizarTurnoProgramaEstado> {
  const supabase = await createClient();

  const hora_inicio = String(formData.get("hora_inicio") ?? "");
  const hora_fin = String(formData.get("hora_fin") ?? "");
  const vigente_desde = String(formData.get("vigente_desde") ?? "");
  const vigente_hasta = String(formData.get("vigente_hasta") ?? "");

  if (!hora_inicio || !hora_fin || !vigente_desde || !vigente_hasta) {
    return { error: "Completá horario y vigencia." };
  }

  const { error } = await supabase
    .from("turnos_programados")
    .update({ hora_inicio, hora_fin, vigente_desde, vigente_hasta })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/empleados/turnos");
  return { error: null };
}

export async function eliminarTurnoPrograma(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("turnos_programados").delete().eq("id", id);
  revalidatePath("/empleados/turnos");
}
