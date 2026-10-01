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

function sumarDia(fecha: string): string {
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
    const dia = diaSemanaIso(fecha);
    const delDia = cambios.filter((c) => c.fecha === fecha);
    const cedidos = new Set(
      delDia.filter((c) => c.tipo === "cambio" && c.empleado_original_id).map((c) => c.empleado_original_id!),
    );

    for (const t of turnos) {
      if (t.dia_semana !== dia || fecha < t.vigente_desde || fecha > t.vigente_hasta) continue;
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
