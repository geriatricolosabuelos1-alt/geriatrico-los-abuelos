"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  crearGastoVariable,
  eliminarGasto,
  type EstadoFormulario,
} from "@/app/sucursales/[id]/gastos/actions";

type FilaGastoVariable = {
  id: string;
  categoria: string;
  monto: number;
  fecha: string;
  descripcion: string | null;
};

type Props = {
  sucursalId: string;
  gastos: FilaGastoVariable[];
};

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

const ESTADO_INICIAL: EstadoFormulario = { error: null };

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GastosVariables({ sucursalId, gastos }: Props) {
  const accionConSucursal = crearGastoVariable.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const total = gastos.reduce((acc, g) => acc + g.monto, 0);

  async function manejarEliminar(id: string) {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    setBorrandoId(id);
    await eliminarGasto(sucursalId, id);
    setBorrandoId(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-sm font-semibold text-ink">Gastos variables</h2>
        <p className="text-xs text-ink-soft">Total del mes: ${total.toLocaleString("es-AR")}</p>
      </div>

      <form
        action={formAction}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-4"
      >
        <div>
          <label className={ETIQUETA}>Categoría</label>
          <input name="categoria" required className={CAMPO} placeholder="Ej: Reparaciones" />
        </div>
        <div>
          <label className={ETIQUETA}>Monto</label>
          <input type="number" step="0.01" name="monto" required className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>Fecha</label>
          <input type="date" name="fecha" required defaultValue={hoyISO()} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>Descripción</label>
          <input name="descripcion" className={CAMPO} placeholder="Opcional" />
        </div>

        {estado.error && <p className="col-span-full text-sm text-red-400">{estado.error}</p>}

        <div className="col-span-full">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "Agregar gasto"}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id} className="border-b border-edge last:border-0">
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {new Date(g.fecha + "T00:00:00").toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                  {g.categoria}
                </td>
                <td className="px-4 py-3 text-ink-soft">{g.descripcion ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-brass whitespace-nowrap">
                  ${g.monto.toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => manejarEliminar(g.id)}
                    disabled={borrandoId === g.id}
                    className="text-xs text-red-400 underline decoration-red-400/40 underline-offset-2 hover:text-red-300 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                  Todavía no hay gastos variables cargados este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
