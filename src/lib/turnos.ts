import type { CambioTurno, TurnoProgramado } from "@/lib/types";

export type TurnoDelDia = {
  fecha: string; // AAAA-MM-DD
  empleadoId: string;
  horaInicio: string;
  horaFin: string;
  // Si viene de un cambio o guardia: quién no vino (cambio) y el tipo.
  origen: "programado" | "cambio" | "guardia";
  reemplazaA: string | null;
};

export function diaSemanaIso(fecha: string): number {
  const dia = new Date(fecha + "T12:00:00Z").getUTCDay();
  return dia === 0 ? 7 : dia;
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta + "T12:00:00Z") - Date.parse(desde + "T12:00:00Z")) / 86_400_000);
}

export function esRotativo(t: TurnoProgramado): boolean {
  return !!t.dias_trabajo && !!t.dias_franco;
}

// ¿Le toca trabajar ese día? Semanal: por día de la semana. Rotativo (2×2, etc.): según el ciclo
// que arranca en vigente_desde (primer día de trabajo).
export function trabajaEseDia(t: TurnoProgramado, fecha: string): boolean {
  if (fecha < t.vigente_desde || fecha > t.vigente_hasta) return false;
  if (esRotativo(t)) {
    const ciclo = t.dias_trabajo! + t.dias_franco!;
    return diasEntre(t.vigente_desde, fecha) % ciclo < t.dias_trabajo!;
  }
  return t.dia_semana === diaSemanaIso(fecha);
}

export function sumarDia(fecha: string): string {
  const d = new Date(fecha + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Turnos que corresponden a cada día del período: los semanales vigentes, menos los que la
// empleada cedió por un cambio, más los cambios y guardias que cubre otra.
export function turnosEfectivos(
  turnos: TurnoProgramado[],
  cambios: CambioTurno[],
  desde: string,
  hasta: string,
): TurnoDelDia[] {
  const resultado: TurnoDelDia[] = [];
  for (let fecha = desde; fecha <= hasta; fecha = sumarDia(fecha)) {
    const delDia = cambios.filter((c) => c.fecha === fecha);
    const cedidos = new Set(
      delDia.filter((c) => c.tipo === "cambio" && c.empleado_original_id).map((c) => c.empleado_original_id!),
    );

    for (const t of turnos) {
      if (!trabajaEseDia(t, fecha)) continue;
      if (cedidos.has(t.empleado_id)) continue;
      resultado.push({
        fecha,
        empleadoId: t.empleado_id,
        horaInicio: t.hora_inicio,
        horaFin: t.hora_fin,
        origen: "programado",
        reemplazaA: null,
      });
    }
    for (const c of delDia) {
      resultado.push({
        fecha,
        empleadoId: c.empleado_reemplazo_id,
        horaInicio: c.hora_inicio,
        horaFin: c.hora_fin,
        origen: c.tipo,
        reemplazaA: c.empleado_original_id,
      });
    }
  }
  return resultado;
}
