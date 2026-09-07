"use client";

import { useActionState } from "react";
import { crearPago, type CrearPagoEstado } from "@/app/residentes/[id]/cuenta-corriente/actions";

type Props = {
  residenteId: string;
  sucursalId: string;
  montoObraSocialDefault: number | null;
  montoPacienteDefault: number | null;
};

const ESTADO_INICIAL: CrearPagoEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function NuevoPagoForm({
  residenteId,
  sucursalId,
  montoObraSocialDefault,
  montoPacienteDefault,
}: Props) {
  const accionConIds = crearPago.bind(null, residenteId, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConIds, ESTADO_INICIAL);
  const hoy = new Date();

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-5"
    >
      <h2 className="col-span-2 font-display text-sm font-semibold text-ink sm:col-span-5">
        Nuevo período
      </h2>
      <p className="col-span-2 -mt-2 text-[0.7rem] text-ink-soft sm:col-span-5">
        Los montos se traen de Arancel — cambialos acá solo si este período puntual tiene un
        acuerdo distinto.
      </p>

      <div>
        <label className={ETIQUETA}>Cubre obra social</label>
        <input
          type="number"
          step="0.01"
          name="monto_obra_social"
          defaultValue={montoObraSocialDefault ?? ""}
          className={CAMPO}
        />
      </div>
      <div>
        <label className={ETIQUETA}>A cargo del paciente</label>
        <input
          type="number"
          step="0.01"
          name="monto_paciente"
          defaultValue={montoPacienteDefault ?? ""}
          className={CAMPO}
        />
      </div>
      <div>
        <label className={ETIQUETA}>Mes</label>
        <select name="mes" required defaultValue={hoy.getMonth() + 1} className={CAMPO}>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1} style={{ backgroundColor: "#0b0a14" }}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ETIQUETA}>Año</label>
        <input
          type="number"
          name="anio"
          required
          defaultValue={hoy.getFullYear()}
          className={CAMPO}
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Agregar"}
        </button>
      </div>

      {estado.error && (
        <p className="col-span-2 text-sm text-red-400 sm:col-span-5">{estado.error}</p>
      )}
    </form>
  );
}
