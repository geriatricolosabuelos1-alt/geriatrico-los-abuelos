"use server";

import { createClient } from "@/lib/supabase/server";
import type { DiaSemana } from "@/lib/types";

export type EstadoTurno = "cubierto" | "incompleto" | "ausente";

export type FilaControlTurno = {
  empleadoId: string;
  nombre: string;
  horaInicioProgramada: string;
  horaFinProgramada: string;
  horaEntradaReal: string | null;
  horaSalidaReal: string | null;
  estado: EstadoTurno;
};

export type FilaSinTurno = {
  empleadoId: string;
  nombre: string;
  horaEntradaReal: string | null;
  horaSalidaReal: string | null;
};

export type ControlTurnosResultado = {
  filas: FilaControlTurno[];
  sinTurno: FilaSinTurno[];
};

function calcularDiaSemana(fecha: string): DiaSemana {
  const d = new Date(fecha + "T00:00:00");
  const dia = d.getDay(); // 0 = domingo
  return (dia === 0 ? 7 : dia) as DiaSemana;
}

export async function controlDeTurnos(sucursalId: string, fecha: string): Promise<ControlTurnosResultado> {
  const supabase = await createClient();
  const diaSemana = calcularDiaSemana(fecha);

  const [{ data: empleados }, { data: turnos }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre_completo")
      .eq("sucursal_id", sucursalId)
      .eq("activo", true)
      .returns<{ id: string; nombre_completo: string }[]>(),
    supabase
      .from("turnos_programados")
      .select("id, empleado_id, hora_inicio, hora_fin")
      .eq("sucursal_id", sucursalId)
      .eq("dia_semana", diaSemana)
      .eq("activo", true)
      .lte("vigente_desde", fecha)
      .gte("vigente_hasta", fecha)
      .returns<{ id: string; empleado_id: string; hora_inicio: string; hora_fin: string }[]>(),
  ]);

  const empleadosPorId = new Map((empleados ?? []).map((e) => [e.id, e.nombre_completo]));
  const empleadoIds = (empleados ?? []).map((e) => e.id);

  const { data: fichadas } = empleadoIds.length
    ? await supabase
        .from("fichadas")
        .select("empleado_id, tipo, hora")
        .in("empleado_id", empleadoIds)
        .eq("fecha", fecha)
        .returns<{ empleado_id: string; tipo: "ingreso" | "egreso"; hora: string }[]>()
    : { data: [] as { empleado_id: string; tipo: "ingreso" | "egreso"; hora: string }[] };

  const entradaPorEmpleado = new Map<string, string>();
  const salidaPorEmpleado = new Map<string, string>();

  for (const f of fichadas ?? []) {
    if (f.tipo === "ingreso") {
      const actual = entradaPorEmpleado.get(f.empleado_id);
      if (!actual || f.hora < actual) entradaPorEmpleado.set(f.empleado_id, f.hora);
    } else {
      const actual = salidaPorEmpleado.get(f.empleado_id);
      if (!actual || f.hora > actual) salidaPorEmpleado.set(f.empleado_id, f.hora);
    }
  }

  const empleadosConTurno = new Set((turnos ?? []).map((t) => t.empleado_id));

  const filas: FilaControlTurno[] = (turnos ?? [])
    .map((t) => {
      const horaEntradaReal = entradaPorEmpleado.get(t.empleado_id) ?? null;
      const horaSalidaReal = salidaPorEmpleado.get(t.empleado_id) ?? null;
      const estado: EstadoTurno =
        horaEntradaReal && horaSalidaReal ? "cubierto" : horaEntradaReal ? "incompleto" : "ausente";

      return {
        empleadoId: t.empleado_id,
        nombre: empleadosPorId.get(t.empleado_id) ?? "—",
        horaInicioProgramada: t.hora_inicio,
        horaFinProgramada: t.hora_fin,
        horaEntradaReal,
        horaSalidaReal,
        estado,
      };
    })
    .sort((a, b) => a.horaInicioProgramada.localeCompare(b.horaInicioProgramada));

  const sinTurno: FilaSinTurno[] = Array.from(entradaPorEmpleado.keys())
    .filter((id) => !empleadosConTurno.has(id))
    .map((id) => ({
      empleadoId: id,
      nombre: empleadosPorId.get(id) ?? "—",
      horaEntradaReal: entradaPorEmpleado.get(id) ?? null,
      horaSalidaReal: salidaPorEmpleado.get(id) ?? null,
    }));

  return { filas, sinTurno };
}
