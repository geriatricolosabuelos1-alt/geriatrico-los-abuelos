"use client";

import { useState } from "react";
import { actualizarTurnoPrograma, eliminarTurnoPrograma } from "@/app/empleados/turnos-actions";
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

function FormularioEdicionTurno({
  turno,
  onCancelar,
  onGuardado,
}: {
  turno: TurnoProgramado;
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const resultado = await actualizarTurnoPrograma(turno.id, formData);

    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
    } else {
      onGuardado();
    }
  }

  async function manejarEliminar() {
    if (!window.confirm("¿Eliminar este día del turno semanal?")) return;
    setEnviando(true);
    await eliminarTurnoPrograma(turno.id);
    onGuardado();
  }

  const CAMPO_MINI =
    "w-full rounded-md border border-edge bg-card px-1.5 py-1 text-xs text-ink focus:border-brass focus:outline-none";

  return (
    <form
      onSubmit={manejarSubmit}
      className="w-36 space-y-1.5 rounded-lg border border-brass/50 bg-panel-deep p-2"
    >
      <div className="flex gap-1">
        <input
          type="time"
          name="hora_inicio"
          defaultValue={turno.hora_inicio.slice(0, 5)}
          required
          className={CAMPO_MINI}
        />
        <input
          type="time"
          name="hora_fin"
          defaultValue={turno.hora_fin.slice(0, 5)}
          required
          className={CAMPO_MINI}
        />
      </div>
      <input
        type="date"
        name="vigente_desde"
        defaultValue={turno.vigente_desde}
        required
        className={CAMPO_MINI}
      />
      <input
        type="date"
        name="vigente_hasta"
        defaultValue={turno.vigente_hasta}
        required
        className={CAMPO_MINI}
      />

      {error && <p className="text-[0.65rem] text-red-700">{error}</p>}

      <div className="flex items-center justify-between gap-1">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-brass px-2 py-1 text-[0.65rem] font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="text-[0.65rem] text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={manejarEliminar}
          disabled={enviando}
          className="text-[0.65rem] text-red-700 hover:text-red-500 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </form>
  );
}

export function TablaTurnosSemanal({ turnos, empleadosPorId }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

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
                        {items.map((t) =>
                          editandoId === t.id ? (
                            <FormularioEdicionTurno
                              key={t.id}
                              turno={t}
                              onCancelar={() => setEditandoId(null)}
                              onGuardado={() => setEditandoId(null)}
                            />
                          ) : (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setEditandoId(t.id)}
                              title="Editar"
                              className="block whitespace-nowrap rounded-md bg-brass-soft px-2 py-1 text-left text-xs text-ink hover:bg-brass-soft/70"
                            >
                              {t.hora_inicio.slice(0, 5)}–{t.hora_fin.slice(0, 5)}
                            </button>
                          ),
                        )}
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
