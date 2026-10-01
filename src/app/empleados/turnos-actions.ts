"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { diaSemanaIso } from "@/lib/turnos";
import type { CambioTurno, DiaSemana, TurnoProgramado } from "@/lib/types";

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
  const empleado_id = String(formData.get("empleado_id") ?? "");
  const dia_semana = Number(formData.get("dia_semana") ?? 0);

  if (!hora_inicio || !hora_fin || !vigente_desde || !vigente_hasta) {
    return { error: "Completá horario y vigencia." };
  }

  const { error } = await supabase
    .from("turnos_programados")
    .update({
      hora_inicio,
      hora_fin,
      vigente_desde,
      vigente_hasta,
      ...(empleado_id ? { empleado_id } : {}),
      ...(dia_semana >= 1 && dia_semana <= 7 ? { dia_semana } : {}),
    })
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

// ---------- Cambios de turno y guardias (días puntuales) ----------

export async function listarCambiosTurno(sucursalId: string): Promise<CambioTurno[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cambios_turno")
    .select(
      "id, sucursal_id, fecha, tipo, empleado_original_id, empleado_reemplazo_id, hora_inicio, hora_fin, motivo, created_at",
    )
    .eq("sucursal_id", sucursalId)
    .order("fecha", { ascending: false })
    .returns<CambioTurno[]>();
  return data ?? [];
}

// Horario semanal que tiene la empleada ese día (para saber qué turno cede).
async function turnoDelDia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empleadoId: string,
  fecha: string,
): Promise<{ hora_inicio: string; hora_fin: string } | null> {
  const { data } = await supabase
    .from("turnos_programados")
    .select("hora_inicio, hora_fin")
    .eq("empleado_id", empleadoId)
    .eq("dia_semana", diaSemanaIso(fecha))
    .eq("activo", true)
    .lte("vigente_desde", fecha)
    .gte("vigente_hasta", fecha)
    .order("hora_inicio")
    .limit(1)
    .returns<{ hora_inicio: string; hora_fin: string }[]>();
  return data?.[0] ?? null;
}

export type RegistrarCambioEstado = { error: string | null; guardado?: boolean };

export async function registrarCambioTurno(
  _estado: RegistrarCambioEstado,
  formData: FormData,
): Promise<RegistrarCambioEstado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sucursal_id = String(formData.get("sucursal_id") ?? "");
  const tipo = formData.get("tipo") === "guardia" ? "guardia" : "cambio";
  const fecha = String(formData.get("fecha") ?? "");
  const original = String(formData.get("empleado_original_id") ?? "") || null;
  const reemplazo = String(formData.get("empleado_reemplazo_id") ?? "");
  let hora_inicio = String(formData.get("hora_inicio") ?? "");
  let hora_fin = String(formData.get("hora_fin") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const fechaDevolucion = String(formData.get("fecha_devolucion") ?? "");

  if (!sucursal_id || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !reemplazo) {
    return { error: "Completá la fecha y quién cubre el turno." };
  }
  if (tipo === "cambio" && !original) return { error: "Elegí qué empleada no hace su turno." };
  if (original && original === reemplazo) return { error: "Elegí dos empleadas distintas." };

  const filas: Record<string, unknown>[] = [];

  if (tipo === "cambio") {
    // Si no se cargó horario, se toma el turno semanal de la empleada que lo cede.
    if (!hora_inicio || !hora_fin) {
      const turno = await turnoDelDia(supabase, original!, fecha);
      if (!turno) return { error: "Esa empleada no tiene turno ese día: cargá el horario a mano." };
      hora_inicio = turno.hora_inicio;
      hora_fin = turno.hora_fin;
    }
  } else if (!hora_inicio || !hora_fin) {
    return { error: "Cargá el horario de la guardia." };
  }

  filas.push({
    sucursal_id,
    fecha,
    tipo,
    empleado_original_id: original,
    empleado_reemplazo_id: reemplazo,
    hora_inicio,
    hora_fin,
    motivo,
    registrado_por: user?.id ?? null,
  });

  // Intercambio: la que cubrió le devuelve el turno otro día.
  if (tipo === "cambio" && fechaDevolucion) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDevolucion)) return { error: "Fecha de devolución inválida." };
    const turnoDevuelto = await turnoDelDia(supabase, reemplazo, fechaDevolucion);
    if (!turnoDevuelto) {
      return { error: "La empleada que cubre no tiene turno el día de la devolución." };
    }
    filas.push({
      sucursal_id,
      fecha: fechaDevolucion,
      tipo: "cambio",
      empleado_original_id: reemplazo,
      empleado_reemplazo_id: original,
      hora_inicio: turnoDevuelto.hora_inicio,
      hora_fin: turnoDevuelto.hora_fin,
      motivo: motivo ? `${motivo} (devolución)` : "Devolución de cambio de turno",
      registrado_por: user?.id ?? null,
    });
  }

  const { error } = await supabase.from("cambios_turno").insert(filas);
  if (error) return { error: error.message };

  revalidatePath("/empleados/turnos");
  revalidatePath("/empleados/control-turnos");
  return { error: null, guardado: true };
}

export async function eliminarCambioTurno(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("cambios_turno").delete().eq("id", id);
  revalidatePath("/empleados/turnos");
  revalidatePath("/empleados/control-turnos");
}
