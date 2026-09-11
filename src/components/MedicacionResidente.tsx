"use client";

import { useActionState, useState } from "react";
import {
  actualizarStockMedicamento,
  agregarMedicamento,
  eliminarMedicamento,
  registrarIngreso,
  type MedicamentoEstado,
  type RegistrarIngresoEstado,
} from "@/app/residentes/[id]/legajo/medicacion-actions";
import type { MedicamentoResidente } from "@/lib/types";

type Props = {
  residenteId: string;
  medicamentos: MedicamentoResidente[];
};

const ESTADO_INICIAL: MedicamentoEstado = { error: null };
const ESTADO_INGRESO_INICIAL: RegistrarIngresoEstado = { error: null };

const CAMPO_CHICO =
  "rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function diasRestantes(medicamento: MedicamentoResidente): number | null {
  if (!medicamento.dosis_diaria || medicamento.dosis_diaria <= 0) return null;
  return Math.floor(medicamento.cantidad_stock / medicamento.dosis_diaria);
}

function FormularioIngreso({
  residenteId,
  medicamentoId,
  onCerrar,
}: {
  residenteId: string;
  medicamentoId: string;
  onCerrar: () => void;
}) {
  const accion = registrarIngreso.bind(null, residenteId, medicamentoId);
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_INGRESO_INICIAL);

  return (
    <form
      action={async (formData) => {
        const resultado = await formAction(formData);
        return resultado;
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel p-2"
    >
      <div>
        <label className="mb-1 block text-[0.6rem] text-ink-soft">Cantidad</label>
        <input type="number" name="cantidad" required className={`${CAMPO_CHICO} w-20`} />
      </div>
      <div>
        <label className="mb-1 block text-[0.6rem] text-ink-soft">Fecha</label>
        <input
          type="date"
          name="fecha"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={CAMPO_CHICO}
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.6rem] text-ink-soft">Lote</label>
        <input name="lote" className={`${CAMPO_CHICO} w-20`} />
      </div>
      <div>
        <label className="mb-1 block text-[0.6rem] text-ink-soft">Vencimiento</label>
        <input type="date" name="vencimiento" className={CAMPO_CHICO} />
      </div>
      <div>
        <label className="mb-1 block text-[0.6rem] text-ink-soft">Entregado por</label>
        <input
          name="entregado_por"
          placeholder="Familia / obra social"
          className={`${CAMPO_CHICO} w-36`}
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-full bg-brass px-3 py-1 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "..." : "Registrar"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
    </form>
  );
}

function FilaMedicamento({
  residenteId,
  medicamento,
}: {
  residenteId: string;
  medicamento: MedicamentoResidente;
}) {
  const [stock, setStock] = useState(medicamento.cantidad_stock);
  const [guardando, setGuardando] = useState(false);
  const [mostrandoIngreso, setMostrandoIngreso] = useState(false);
  const restantes = diasRestantes(medicamento);

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
    <>
      <tr className="border-t border-edge align-top">
        <td className="px-3 py-2 text-sm text-ink">
          {medicamento.nombre}
          {medicamento.instrucciones && (
            <p className="mt-0.5 text-[0.65rem] text-ink-soft">{medicamento.instrucciones}</p>
          )}
        </td>
        <td className="px-3 py-2 text-sm text-ink-soft">{medicamento.dosis ?? "—"}</td>
        <td className="px-3 py-2 text-xs text-ink-soft">
          {medicamento.frecuencia ?? "—"}
          {medicamento.horario && (
            <p className="mt-0.5 text-[0.65rem] text-ink-soft">🕐 {medicamento.horario}</p>
          )}
        </td>
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
        <td className="px-3 py-2 text-xs">
          {restantes === null ? (
            <span className="text-ink-soft">—</span>
          ) : (
            <span
              className={
                restantes <= 7
                  ? "font-semibold text-red-700"
                  : restantes <= 14
                    ? "font-semibold text-amber-600"
                    : "text-ink-soft"
              }
            >
              {restantes} día{restantes === 1 ? "" : "s"}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => setMostrandoIngreso((v) => !v)}
            className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            + Ingreso
          </button>
          <button
            type="button"
            onClick={borrar}
            className="text-xs text-red-700 hover:text-red-500"
          >
            Eliminar
          </button>
        </td>
      </tr>
      {mostrandoIngreso && (
        <tr className="border-t border-edge">
          <td colSpan={6} className="px-3 pb-3">
            <FormularioIngreso
              residenteId={residenteId}
              medicamentoId={medicamento.id}
              onCerrar={() => setMostrandoIngreso(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

export function MedicacionResidente({ residenteId, medicamentos }: Props) {
  const accionConId = agregarMedicamento.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);

  return (
    <section className="rounded-2xl border border-edge bg-card p-5 lg:col-span-2 xl:col-span-3">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">
        Medicación, prescripción y stock personal
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
                <th className="px-3 py-2">Frecuencia / horario</th>
                <th className="px-3 py-2">Stock (comp.)</th>
                <th className="px-3 py-2">Días restantes</th>
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

      <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Medicamento
          </label>
          <input
            name="nombre"
            required
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: Losartán"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Dosis
          </label>
          <input
            name="dosis"
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: 50mg"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Frecuencia
          </label>
          <input
            name="frecuencia"
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Cada 8 hs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Horario
          </label>
          <input
            name="horario"
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="08:00, 16:00, 00:00"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Dosis diaria (comp./día)
          </label>
          <input
            type="number"
            name="dosis_diaria"
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            placeholder="3"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Stock inicial
          </label>
          <input
            type="number"
            name="cantidad_stock"
            defaultValue={0}
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div className="col-span-2 sm:col-span-3 lg:col-span-5">
          <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Instrucciones
          </label>
          <input
            name="instrucciones"
            className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: con las comidas"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="h-fit self-end rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Agregando..." : "+ Agregar"}
        </button>
      </form>
      {estado.error && <p className="mt-2 text-sm text-red-700">{estado.error}</p>}
    </section>
  );
}
