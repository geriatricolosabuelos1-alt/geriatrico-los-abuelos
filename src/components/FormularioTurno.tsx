"use client";

import { useActionState, useState } from "react";
import { registrarTurno, type RegistrarTurnoEstado } from "@/app/empleados/turnos-actions";

type Props = {
  sucursalId: string;
  empleados: { id: string; nombre_completo: string }[];
  fecha: string;
};

const ESTADO_INICIAL: RegistrarTurnoEstado = { error: null };

const PRESETS: Record<string, { inicio: string; fin: string; horas: number }> = {
  "Mañana (08:00–14:00)": { inicio: "08:00", fin: "14:00", horas: 6 },
  "Tarde (14:00–20:00)": { inicio: "14:00", fin: "20:00", horas: 6 },
  "Noche (20:00–08:00)": { inicio: "20:00", fin: "08:00", horas: 12 },
  "Personalizado": { inicio: "", fin: "", horas: 0 },
};

const CAMPO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

export function FormularioTurno({ sucursalId, empleados, fecha }: Props) {
  const [estado, formAction, enviando] = useActionState(registrarTurno, ESTADO_INICIAL);
  const [preset, setPreset] = useState("Mañana (08:00–14:00)");
  const [horaInicio, setHoraInicio] = useState(PRESETS["Mañana (08:00–14:00)"].inicio);
  const [horaFin, setHoraFin] = useState(PRESETS["Mañana (08:00–14:00)"].fin);
  const [horas, setHoras] = useState(PRESETS["Mañana (08:00–14:00)"].horas);

  function elegirPreset(nombre: string) {
    setPreset(nombre);
    const p = PRESETS[nombre];
    setHoraInicio(p.inicio);
    setHoraFin(p.fin);
    setHoras(p.horas);
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-3 font-display text-sm font-semibold text-ink">
        Registrar turno cubierto
      </h2>
      <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <input type="hidden" name="sucursal_id" value={sucursalId} />

        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Empleado
          </label>
          <select name="empleado_id" required className={CAMPO}>
            <option value="">Elegir...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre_completo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Fecha
          </label>
          <input type="date" name="fecha" defaultValue={fecha} required className={CAMPO} />
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Turno
          </label>
          <select
            value={preset}
            onChange={(e) => elegirPreset(e.target.value)}
            className={CAMPO}
          >
            {Object.keys(PRESETS).map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
          <input type="hidden" name="turno" value={preset} />
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Hora inicio
          </label>
          <input
            type="time"
            name="hora_inicio"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Hora fin
          </label>
          <input
            type="time"
            name="hora_fin"
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Horas
          </label>
          <input
            type="number"
            step="0.5"
            name="horas"
            value={horas}
            onChange={(e) => setHoras(Number(e.target.value))}
            required
            className={CAMPO}
          />
        </div>

        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Observación
          </label>
          <input name="observacion" placeholder="Opcional" className={CAMPO} />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="col-span-2 h-fit self-end rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50 sm:col-span-1"
        >
          {enviando ? "Guardando..." : "+ Registrar"}
        </button>
      </form>
      {estado.error && <p className="mt-2 text-sm text-red-700">{estado.error}</p>}
    </section>
  );
}
