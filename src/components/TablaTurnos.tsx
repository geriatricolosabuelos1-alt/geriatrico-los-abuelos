"use client";

import { eliminarTurno } from "@/app/empleados/turnos-actions";
import type { TurnoCubierto } from "@/lib/types";

type Props = {
  turnos: TurnoCubierto[];
  empleadosPorId: Map<string, string>;
};

export function TablaTurnos({ turnos, empleadosPorId }: Props) {
  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar este registro de turno?")) return;
    await eliminarTurno(id);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Empleado</th>
            <th className="px-4 py-3">Turno</th>
            <th className="px-4 py-3">Horario</th>
            <th className="px-4 py-3">Horas</th>
            <th className="px-4 py-3">Observación</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((t) => (
            <tr key={t.id} className="border-b border-edge last:border-0">
              <td className="px-4 py-3 text-ink whitespace-nowrap">
                {new Date(t.fecha + "T00:00:00").toLocaleDateString("es-AR")}
              </td>
              <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                {empleadosPorId.get(t.empleado_id) ?? "—"}
              </td>
              <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{t.turno}</td>
              <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                {t.hora_inicio && t.hora_fin
                  ? `${t.hora_inicio.slice(0, 5)}–${t.hora_fin.slice(0, 5)}`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-ink-soft">{t.horas} hs</td>
              <td className="px-4 py-3 text-ink-soft">{t.observacion ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => borrar(t.id)}
                  className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
          {turnos.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-ink-soft">
                No hay turnos registrados en este período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
