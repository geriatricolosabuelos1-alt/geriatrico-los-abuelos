"use client";

import { useState, useTransition } from "react";
import { darDeBajaEmpleado, reincorporarEmpleado } from "@/app/empleados/actions";
import { MOTIVOS_BAJA_EMPLEADO } from "@/lib/egresos";

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
}

// "Dar de baja" un empleado: pide fecha y motivo, y lo pasa a "Empleados dados de baja".
export function BotonBajaEmpleado({ empleadoId, nombre }: { empleadoId: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy());
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await darDeBajaEmpleado(empleadoId, { fecha, motivo, detalle });
      if (r.error) setError(r.error);
      else setAbierto(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mr-3 text-xs font-semibold text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
      >
        Dar de baja
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-edge bg-card p-6 text-left shadow-2xl">
            <div>
              <p className="font-display text-lg font-semibold text-ink">Dar de baja</p>
              <p className="text-sm text-ink-soft">{nombre}</p>
            </div>
            <div>
              <label className={ETIQUETA_MIN}>Fecha de baja</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA_MIN}>Motivo</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={CAMPO}>
                <option value="">Elegí...</option>
                {MOTIVOS_BAJA_EMPLEADO.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ETIQUETA_MIN}>Detalle (opcional)</label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                rows={2}
                placeholder="Solo si hace falta aclarar algo"
                className={CAMPO}
              />
            </div>
            <p className="text-xs text-ink-soft">
              Deja de aparecer en la lista de empleados, en turnos y en el fichado. Queda guardado en
              &quot;Empleados dados de baja&quot; con toda su información.
            </p>
            {error && <p className="text-xs text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-brass"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={pendiente}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {pendiente ? "Guardando..." : "Confirmar baja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BotonReincorporarEmpleado({ empleadoId, nombre }: { empleadoId: string; nombre: string }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        if (!window.confirm(`¿Reincorporar a ${nombre}? Vuelve a la lista de empleados activos.`)) return;
        iniciar(async () => {
          const r = await reincorporarEmpleado(empleadoId);
          if (r.error) window.alert(r.error);
        });
      }}
      className="mr-3 text-xs font-semibold text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink disabled:opacity-50"
    >
      {pendiente ? "Reincorporando..." : "Reincorporar"}
    </button>
  );
}
