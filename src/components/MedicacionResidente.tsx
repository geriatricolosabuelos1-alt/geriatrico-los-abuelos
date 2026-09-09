"use client";

import { useActionState, useState } from "react";
import {
  actualizarStockMedicamento,
  agregarMedicamento,
  eliminarMedicamento,
  type MedicamentoEstado,
} from "@/app/residentes/[id]/legajo/medicacion-actions";
import type { MedicamentoResidente } from "@/lib/types";

type Props = {
  residenteId: string;
  medicamentos: MedicamentoResidente[];
};

const ESTADO_INICIAL: MedicamentoEstado = { error: null };

function FilaMedicamento({
  residenteId,
  medicamento,
}: {
  residenteId: string;
  medicamento: MedicamentoResidente;
}) {
  const [stock, setStock] = useState(medicamento.cantidad_stock);
  const [guardando, setGuardando] = useState(false);

  async function guardarStock() {
    setGuardando(true);
    await actualizarStockMedicamento(residenteId, medicamento.id, stock);
    setGuardando(false);
  }

  async function borrar() {
    if (!window.confirm(`¿Eliminar "${medicamento.nombre}" del listado?`)) return;
    await eliminarMedicamento(residenteId, medicamento.id);
  }

  return (
    <tr className="border-t border-edge">
      <td className="px-3 py-2 text-sm text-ink">{medicamento.nombre}</td>
      <td className="px-3 py-2 text-sm text-ink-soft">{medicamento.dosis ?? "—"}</td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          onBlur={guardarStock}
          className="w-20 rounded-lg border border-edge bg-panel-deep px-2 py-1 text-sm text-ink focus:border-brass focus:outline-none"
        />
        {guardando && <span className="ml-2 text-[0.65rem] text-ink-soft">guardando...</span>}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={borrar}
          className="text-xs text-red-700 hover:text-red-500"
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}

export function MedicacionResidente({ residenteId, medicamentos }: Props) {
  const accionConId = agregarMedicamento.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);

  return (
    <section className="rounded-2xl border border-edge bg-card p-5 lg:col-span-2 xl:col-span-3">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">
        Medicación y stock personal
      </h2>

      {medicamentos.length === 0 ? (
        <p className="mb-3 text-xs text-ink-soft">Sin medicamentos cargados.</p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Medicamento</th>
                <th className="px-3 py-2">Dosis</th>
                <th className="px-3 py-2">Stock (comp.)</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {medicamentos.map((m) => (
                <FilaMedicamento key={m.id} residenteId={residenteId} medicamento={m} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Medicamento
          </label>
          <input
            name="nombre"
            required
            className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: Losartán"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Dosis
          </label>
          <input
            name="dosis"
            className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: 50mg"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Stock
          </label>
          <input
            type="number"
            name="cantidad_stock"
            defaultValue={0}
            className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Agregando..." : "+ Agregar"}
        </button>
      </form>
      {estado.error && <p className="mt-2 text-sm text-red-700">{estado.error}</p>}
    </section>
  );
}
