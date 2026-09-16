"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearTurnoPrograma, type CrearTurnoProgramaEstado } from "@/app/empleados/turnos-actions";

type EmpleadoOpcion = { id: string; nombre_completo: string };

type Props = {
  sucursalId: string;
  empleados: EmpleadoOpcion[];
};

const ESTADO_INICIAL: CrearTurnoProgramaEstado = { error: null };

const DIAS = [
  { valor: 1, etiqueta: "Lunes" },
  { valor: 2, etiqueta: "Martes" },
  { valor: 3, etiqueta: "Miércoles" },
  { valor: 4, etiqueta: "Jueves" },
  { valor: 5, etiqueta: "Viernes" },
  { valor: 6, etiqueta: "Sábado" },
  { valor: 7, etiqueta: "Domingo" },
];

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft";

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function finDeAnio(): string {
  return `${new Date().getFullYear()}-12-31`;
}

export function FormularioTurnoPrograma({ sucursalId, empleados }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction, enviando] = useActionState(crearTurnoPrograma, ESTADO_INICIAL);
  const enviandoAnterior = useRef(enviando);

  useEffect(() => {
    if (enviandoAnterior.current && !enviando && !estado.error) {
      setAbierto(false);
    }
    enviandoAnterior.current = enviando;
  }, [enviando, estado.error]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
      >
        + Nuevo turno semanal
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="sucursal_id" value={sucursalId} />

      <div className="col-span-full flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">Nuevo turno semanal</h2>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Empleado</label>
        <select name="empleado_id" required className={CAMPO}>
          <option value="">Seleccionar...</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre_completo}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Días de la semana</label>
        <div className="flex flex-wrap gap-3">
          {DIAS.map((d) => (
            <label key={d.valor} className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="dias" value={d.valor} className="h-3.5 w-3.5" />
              {d.etiqueta}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={ETIQUETA}>Hora entrada</label>
        <input type="time" name="hora_inicio" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Hora salida</label>
        <input type="time" name="hora_fin" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Vigente desde</label>
        <input type="date" name="vigente_desde" defaultValue={hoy()} required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Vigente hasta</label>
        <input type="date" name="vigente_hasta" defaultValue={finDeAnio()} required className={CAMPO} />
        <p className="mt-1 text-[0.65rem] text-ink-soft">
          Por defecto llega hasta fin de año — se repite automáticamente esa combinación de días.
        </p>
      </div>

      {estado.error && <p className="col-span-full text-sm text-red-700">{estado.error}</p>}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar turno semanal"}
        </button>
      </div>
    </form>
  );
}
