"use client";

import { eliminarTurnoPrograma } from "@/app/empleados/turnos-actions";
import type { TurnoProgramado } from "@/lib/types";

type Props = {
  turnos: TurnoProgramado[];
  empleadosPorId: Map<string, string>;
};

const DIAS = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miércoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sábado" },
  { valor: 7, etiqueta: "Domingo" },
];

function horasEntre(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(":").map(Number);
  const [hf, mf] = fin.split(":").map(Number);
  let minutos = hf * 60 + mf - (hi * 60 + mi);
  if (minutos <= 0) minutos += 24 * 60;
  return Math.round((minutos / 60) * 100) / 100;
}

export function TablaTurnosSemanal({ turnos, empleadosPorId }: Props) {
  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar este día del turno semanal?")) return;
    await eliminarTurnoPrograma(id);
  }

  const empleadoIds = Array.from(new Set(turnos.map((t) => t.empleado_id))).sort((a, b) =>
    (empleadosPorId.get(a) ?? "").localeCompare(empleadosPorId.get(b) ?? ""),
  );

  const porEmpleadoYDia = new Map<string, TurnoProgramado[]>();
  for (const t of turnos) {
    const clave = `${t.empleado_id}_${t.dia_semana}`;
    const arr = porEmpleadoYDia.get(clave) ?? [];
    arr.push(t);
    porEmpleadoYDia.set(clave, arr);
  }

  const totalesPorEmpleado = new Map<string, number>();
  for (const t of turnos) {
    totalesPorEmpleado.set(
      t.empleado_id,
      (totalesPorEmpleado.get(t.empleado_id) ?? 0) + horasEntre(t.hora_inicio, t.hora_fin),
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Empleado</th>
            {DIAS.map((d) => (
              <th key={d.valor} className="px-3 py-3">
                {d.etiqueta}
              </th>
            ))}
            <th className="px-4 py-3">Hs/semana</th>
          </tr>
        </thead>
        <tbody>
          {empleadoIds.map((empleadoId) => (
            <tr key={empleadoId} className="border-b border-edge align-top last:border-0">
              <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                {empleadosPorId.get(empleadoId) ?? "—"}
              </td>
              {DIAS.map((d) => {
                const items = porEmpleadoYDia.get(`${empleadoId}_${d.valor}`) ?? [];
                return (
                  <td key={d.valor} className="px-3 py-3">
                    {items.length === 0 ? (
                      <span className="text-ink-soft">—</span>
                    ) : (
                      <div className="space-y-1">
                        {items.map((t) => (
                          <div
                            key={t.id}
                            className="group flex items-center gap-1 whitespace-nowrap rounded-md bg-brass-soft px-2 py-1 text-xs text-ink"
                          >
                            {t.hora_inicio.slice(0, 5)}–{t.hora_fin.slice(0, 5)}
                            <button
                              onClick={() => borrar(t.id)}
                              title="Eliminar"
                              className="ml-1 text-[0.65rem] text-red-700 opacity-0 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                {totalesPorEmpleado.get(empleadoId) ?? 0} hs
              </td>
            </tr>
          ))}
          {empleadoIds.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-ink-soft">
                No hay turnos semanales asignados en esta sede.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
