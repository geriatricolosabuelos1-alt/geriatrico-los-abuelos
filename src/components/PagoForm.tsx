"use client";

import { useActionState } from "react";
import { crearPago, type CrearPagoEstado } from "@/app/sucursales/[id]/cuotas/actions";

type Props = {
  sucursalId: string;
  residentes: { id: string; nombre: string; apellido: string }[];
};

const ESTADO_INICIAL: CrearPagoEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function PagoForm({ sucursalId, residentes }: Props) {
  const accionConSucursal = crearPago.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);
  const hoy = new Date();

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Nuevo arancel
      </h2>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Residente</label>
        <select name="residente_id" required className={CAMPO}>
          <option value="">Seleccionar...</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={ETIQUETA}>Monto</label>
        <input type="number" step="0.01" name="monto" required className={CAMPO} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={ETIQUETA}>Mes</label>
          <select name="mes" required defaultValue={hoy.getMonth() + 1} className={CAMPO}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
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
      </div>

      {estado.error && (
        <p className="col-span-full text-sm text-red-400">{estado.error}</p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar arancel"}
        </button>
      </div>
    </form>
  );
}
