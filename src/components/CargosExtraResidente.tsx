"use client";

import { Fragment, useState } from "react";
import {
  eliminarCargoExtra,
  marcarCargoExtraPagado,
} from "@/app/residentes/[id]/cuenta-corriente/actions";
import type { CargoExtraResidente } from "@/lib/types";

type Props = {
  residenteId: string;
  cargos: CargoExtraResidente[];
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function claveMes(fecha: string): string {
  return fecha.slice(0, 7); // "YYYY-MM"
}

function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split("-").map(Number);
  return `${MESES[mes - 1]} ${anio}`;
}

function FilaCargo({ residenteId, cargo }: { residenteId: string; cargo: CargoExtraResidente }) {
  const [enviando, setEnviando] = useState(false);

  async function alternarPagado() {
    setEnviando(true);
    await marcarCargoExtraPagado(residenteId, cargo.id, !cargo.pagado);
    setEnviando(false);
  }

  async function borrar() {
    if (!window.confirm(`¿Eliminar el cargo "${cargo.concepto}"?`)) return;
    await eliminarCargoExtra(residenteId, cargo.id);
  }

  return (
    <tr className="border-b border-edge last:border-0">
      <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap">
        {new Date(cargo.fecha + "T00:00:00").toLocaleDateString("es-AR")}
      </td>
      <td className="px-3 py-2.5 text-ink">{cargo.concepto}</td>
      <td className="px-3 py-2.5 text-ink-soft">${cargo.monto.toLocaleString("es-AR")}</td>
      <td className="px-3 py-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            cargo.pagado ? "bg-brass-soft text-brass" : "bg-edge text-ink-soft"
          }`}
        >
          {cargo.pagado ? "Pagado" : "Pendiente"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={alternarPagado}
          disabled={enviando}
          className="mr-3 text-xs font-medium text-brass hover:text-ink disabled:opacity-50"
        >
          {cargo.pagado ? "Marcar pendiente" : "Marcar pagado"}
        </button>
        <button
          type="button"
          onClick={borrar}
          className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}

export function CargosExtraResidente({ residenteId, cargos }: Props) {
  if (cargos.length === 0) return null;

  const totalPendiente = cargos.filter((c) => !c.pagado).reduce((acc, c) => acc + c.monto, 0);

  const grupos = new Map<string, CargoExtraResidente[]>();
  cargos.forEach((c) => {
    const clave = claveMes(c.fecha);
    grupos.set(clave, [...(grupos.get(clave) ?? []), c]);
  });
  const clavesOrdenadas = [...grupos.keys()].sort().reverse();

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge bg-card print:overflow-visible print:rounded-none print:border-0 print:bg-white">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3 print:border-neutral-300">
        <h2 className="font-display text-sm font-semibold text-ink print:text-black">
          Insumos extra consumidos (imputados a cuenta corriente)
        </h2>
        {totalPendiente > 0 && (
          <span className="text-xs font-semibold text-red-700">
            Pendiente: ${totalPendiente.toLocaleString("es-AR")}
          </span>
        )}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:bg-white print:text-neutral-500">
          <tr>
            <th className="px-3 py-2.5">Fecha</th>
            <th className="px-3 py-2.5">Concepto</th>
            <th className="px-3 py-2.5">Monto</th>
            <th className="px-3 py-2.5">Estado</th>
            <th className="px-3 py-2.5 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {clavesOrdenadas.map((clave) => {
            const items = grupos.get(clave)!;
            const totalMes = items.reduce((acc, c) => acc + c.monto, 0);
            return (
              <Fragment key={clave}>
                <tr className="border-b border-edge bg-panel-deep">
                  <td colSpan={2} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink">
                    {etiquetaMes(clave)}
                  </td>
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-ink">
                    Total del mes: ${totalMes.toLocaleString("es-AR")}
                  </td>
                </tr>
                {items.map((c) => (
                  <FilaCargo key={c.id} residenteId={residenteId} cargo={c} />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
