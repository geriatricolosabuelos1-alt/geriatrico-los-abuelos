"use client";

import { eliminarTurnoPrograma } from "@/app/empleados/turnos-actions";
import { sumarDia, trabajaEseDia } from "@/lib/turnos";
import type { TurnoProgramado } from "@/lib/types";

const NOMBRE_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
}

function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}

function etiquetaDia(fecha: string): string {
  const d = new Date(fecha + "T12:00:00Z");
  return `${NOMBRE_DIA[d.getUTCDay()]} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`;
}

// Turnos rotativos (2×2, etc.): ciclo, horario y los próximos días de trabajo y franco.
export function TurnosRotativos({
  turnos,
  empleadosPorId,
}: {
  turnos: TurnoProgramado[];
  empleadosPorId: Map<string, string>;
}) {
  if (turnos.length === 0) return null;
  const desde = hoy();
  const proximos: string[] = [];
  for (let f = desde, i = 0; i < 14; f = sumarDia(f), i++) proximos.push(f);

  return (
    <section className="space-y-3 rounded-2xl border border-edge bg-card p-5">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">Turnos rotativos</h2>
        <p className="text-xs text-ink-soft">Se repiten solos: trabaja los días indicados y después tiene franco.</p>
      </div>
      <div className="space-y-3">
        {[...turnos]
          .sort((a, b) => (empleadosPorId.get(a.empleado_id) ?? "").localeCompare(empleadosPorId.get(b.empleado_id) ?? ""))
          .map((t) => (
            <div key={t.id} className="rounded-xl border border-edge bg-panel-deep/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{empleadosPorId.get(t.empleado_id) ?? "—"}</span> · {t.dias_trabajo}×
                  {t.dias_franco} ({t.dias_trabajo} de trabajo, {t.dias_franco} de franco) · {t.hora_inicio.slice(0, 5)}–
                  {t.hora_fin.slice(0, 5)}
                  <span className="text-xs text-ink-soft">
                    {" "}
                    · desde {fechaCorta(t.vigente_desde)} hasta {fechaCorta(t.vigente_hasta)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("¿Eliminar este turno rotativo?")) return;
                    await eliminarTurnoPrograma(t.id);
                  }}
                  className="text-xs text-red-700 hover:text-red-500"
                >
                  Eliminar
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {proximos.map((f) => {
                  const trabaja = trabajaEseDia(t, f);
                  return (
                    <span
                      key={f}
                      className={`rounded-md px-2 py-1 text-[0.7rem] ${
                        trabaja ? "bg-brass-soft font-semibold text-ink" : "border border-dashed border-edge text-ink-soft"
                      }`}
                    >
                      {etiquetaDia(f)} · {trabaja ? "Trabaja" : "Franco"}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
