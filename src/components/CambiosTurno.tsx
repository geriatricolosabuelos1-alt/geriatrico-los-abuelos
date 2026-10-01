"use client";

import { useActionState, useState } from "react";
import {
  eliminarCambioTurno,
  registrarCambioTurno,
  type RegistrarCambioEstado,
} from "@/app/empleados/turnos-actions";
import type { CambioTurno } from "@/lib/types";

const INICIAL: RegistrarCambioEstado = { error: null };
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
}

function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}

// Cambios de turno entre empleadas y guardias para un día puntual.
export function CambiosTurno({
  sucursalId,
  empleados,
  cambios,
}: {
  sucursalId: string;
  empleados: { id: string; nombre_completo: string }[];
  cambios: CambioTurno[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"cambio" | "guardia">("cambio");
  const [intercambio, setIntercambio] = useState(false);
  const [estado, formAction, enviando] = useActionState(registrarCambioTurno, INICIAL);
  const nombre = new Map(empleados.map((e) => [e.id, e.nombre_completo]));

  // El formulario se cierra solo después de guardar bien (estado nuevo con guardado = true).
  const [estadoAlAbrir, setEstadoAlAbrir] = useState(estado);
  const visible = abierto && (estado === estadoAlAbrir || !estado.guardado);

  return (
    <section className="space-y-3 rounded-2xl border border-edge bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Cambios de turno y guardias</h2>
          <p className="text-xs text-ink-soft">
            Para un día puntual: no cambian el turno semanal, pero sí el PDF y el control de turnos de ese día.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEstadoAlAbrir(estado);
            setAbierto(!visible);
          }}
          className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink hover:border-brass"
        >
          {visible ? "Cancelar" : "+ Registrar cambio o guardia"}
        </button>
      </div>

      {visible && (
        <form action={formAction} className="grid grid-cols-1 gap-3 rounded-xl border border-edge bg-panel-deep p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="sucursal_id" value={sucursalId} />
          <input type="hidden" name="tipo" value={tipo} />
          <div className="flex gap-1 sm:col-span-2 lg:col-span-4">
            {(
              [
                ["cambio", "Cambio de turno"],
                ["guardia", "Guardia / turno extra"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setTipo(valor)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  tipo === valor ? "bg-brass text-btn-ink" : "border border-edge text-ink-soft hover:text-ink"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          <div>
            <label className={ETIQUETA}>Fecha</label>
            <input type="date" name="fecha" required defaultValue={hoy()} className={CAMPO} />
          </div>
          <div>
            <label className={ETIQUETA}>{tipo === "cambio" ? "Empleada que no viene" : "En lugar de (opcional)"}</label>
            <select name="empleado_original_id" required={tipo === "cambio"} defaultValue="" className={CAMPO}>
              <option value="">{tipo === "cambio" ? "Elegí..." : "—"}</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ETIQUETA}>{tipo === "cambio" ? "La cubre" : "Hace la guardia"}</label>
            <select name="empleado_reemplazo_id" required defaultValue="" className={CAMPO}>
              <option value="">Elegí...</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ETIQUETA}>
              Horario {tipo === "cambio" && <span className="normal-case">(vacío = su turno de ese día)</span>}
            </label>
            <div className="flex gap-1">
              <input type="time" name="hora_inicio" required={tipo === "guardia"} className={CAMPO} />
              <input type="time" name="hora_fin" required={tipo === "guardia"} className={CAMPO} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={ETIQUETA}>Motivo (opcional)</label>
            <input name="motivo" placeholder="Ej: turno médico, enfermedad, pedido personal" className={CAMPO} />
          </div>
          {tipo === "cambio" && (
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={intercambio}
                  onChange={(e) => setIntercambio(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-brass)]"
                />
                Es un intercambio: se lo devuelve otro día
              </label>
              {intercambio && (
                <div className="mt-2">
                  <label className={ETIQUETA}>Día en que la que no vino cubre el turno de la otra</label>
                  <input type="date" name="fecha_devolucion" required className={CAMPO} />
                </div>
              )}
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
            >
              {enviando ? "Guardando..." : "Guardar"}
            </button>
            {estado.error && <p className="mt-1 text-xs text-red-700">{estado.error}</p>}
          </div>
        </form>
      )}

      {cambios.length === 0 ? (
        <p className="text-sm text-ink-soft">No hay cambios ni guardias registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">No viene</th>
                <th className="px-3 py-2">Cubre / hace guardia</th>
                <th className="px-3 py-2">Horario</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c) => (
                <tr key={c.id} className="border-t border-edge">
                  <td className="px-3 py-2 whitespace-nowrap text-ink">{fechaCorta(c.fecha)}</td>
                  <td className="px-3 py-2 text-ink-soft">{c.tipo === "cambio" ? "Cambio de turno" : "Guardia"}</td>
                  <td className="px-3 py-2 text-ink-soft">
                    {c.empleado_original_id ? (nombre.get(c.empleado_original_id) ?? "—") : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{nombre.get(c.empleado_reemplazo_id) ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                    {c.hora_inicio.slice(0, 5)}–{c.hora_fin.slice(0, 5)}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-soft">{c.motivo ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm("¿Eliminar este cambio?")) return;
                        await eliminarCambioTurno(c.id);
                      }}
                      className="text-xs text-red-700 hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
