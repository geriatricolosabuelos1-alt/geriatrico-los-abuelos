"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TurnoCubierto } from "@/lib/types";

export async function listarTurnos(
  sucursalId: string,
  mes: number,
  anio: number,
): Promise<TurnoCubierto[]> {
  const supabase = await createClient();
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hasta = new Date(anio, mes, 0).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("turnos_cubiertos")
    .select(
      "id, empleado_id, sucursal_id, fecha, turno, hora_inicio, hora_fin, horas, observacion, registrado_por, created_at",
    )
    .eq("sucursal_id", sucursalId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .returns<TurnoCubierto[]>();

  return data ?? [];
}

export type RegistrarTurnoEstado = { error: string | null };

export async function registrarTurno(
  _estado: RegistrarTurnoEstado,
  formData: FormData,
): Promise<RegistrarTurnoEstado> {
  const supabase = await createClient();

  const empleado_id = String(formData.get("empleado_id") ?? "");
  const sucursal_id = String(formData.get("sucursal_id") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const turno = String(formData.get("turno") ?? "").trim();
  const hora_inicio = String(formData.get("hora_inicio") ?? "").trim() || null;
  const hora_fin = String(formData.get("hora_fin") ?? "").trim() || null;
  const horas = Number(formData.get("horas") ?? 0);
  const observacion = String(formData.get("observacion") ?? "").trim() || null;

  if (!empleado_id || !sucursal_id || !fecha || !turno) {
    return { error: "Faltan datos obligatorios (empleado, sede, fecha y turno)." };
  }
  if (!horas || horas <= 0) {
    return { error: "Las horas deben ser mayores a cero." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("turnos_cubiertos").insert({
    empleado_id,
    sucursal_id,
    fecha,
    turno,
    hora_inicio,
    hora_fin,
    horas,
    observacion,
    registrado_por: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/empleados/turnos");
  return { error: null };
}

export async function eliminarTurno(turnoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("turnos_cubiertos").delete().eq("id", turnoId);
  revalidatePath("/empleados/turnos");
}
