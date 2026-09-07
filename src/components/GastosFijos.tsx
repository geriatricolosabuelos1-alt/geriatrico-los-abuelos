"use client";

import { useState } from "react";
import {
  actualizarMontoGasto,
  agregarGastoFijoCatalogo,
  eliminarGasto,
  generarGastosFijosDelMes,
  type EstadoFormulario,
} from "@/app/sucursales/[id]/gastos/actions";
import type { GastoFijoCatalogo } from "@/lib/types";

type FilaGastoFijo = {
  id: string;
  categoria: string;
  monto: number;
  gasto_fijo_id: string | null;
};

type Props = {
  sucursalId: string;
  mes: number;
  anio: number;
  catalogo: GastoFijoCatalogo[];
  gastosDelMes: FilaGastoFijo[];
};

const CAMPO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function FilaMonto({ gasto }: { gasto: FilaGastoFijo }) {
  const [monto, setMonto] = useState(String(gasto.monto));
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const formData = new FormData(e.currentTarget);
    await actualizarMontoGasto(formData);
    setEnviando(false);
  }

  return (
    <form onSubmit={manejarSubmit} className="flex items-center gap-1.5">
      <input type="hidden" name="gasto_id" value={gasto.id} />
      <span className="text-ink-soft">$</span>
      <input
        type="number"
        step="0.01"
        name="monto"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        className="w-28 rounded-md border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
      />
      <button
        type="submit"
        disabled={enviando}
        className="text-xs font-medium text-brass hover:text-ink disabled:opacity-50"
      >
        {enviando ? "..." : "Guardar"}
      </button>
    </form>
  );
}

export function GastosFijos({ sucursalId, mes, anio, catalogo, gastosDelMes }: Props) {
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [estado, setEstado] = useState<EstadoFormulario>({ error: null });
  const [enviandoNuevo, setEnviandoNuevo] = useState(false);

  const gastosPorCatalogoId = new Map<string, FilaGastoFijo>();
  gastosDelMes.forEach((g) => {
    if (g.gasto_fijo_id) gastosPorCatalogoId.set(g.gasto_fijo_id, g);
  });

  const total = gastosDelMes.reduce((acc, g) => acc + g.monto, 0);

  async function manejarGenerar() {
    setGenerando(true);
    setMensaje(null);
    const resultado = await generarGastosFijosDelMes(sucursalId, mes, anio);
    setGenerando(false);
    setMensaje(
      `Se generaron ${resultado.generados} gasto(s). ${resultado.omitidos} ya estaban cargados.`,
    );
  }

  async function manejarNuevoCatalogo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviandoNuevo(true);
    const formData = new FormData(e.currentTarget);
    const resultado = await agregarGastoFijoCatalogo({ error: null }, formData);
    setEnviandoNuevo(false);
    if (resultado.error) {
      setEstado(resultado);
    } else {
      setEstado({ error: null });
      setMostrarNuevo(false);
      (e.target as HTMLFormElement).reset();
    }
  }

  async function manejarEliminar(id: string) {
    if (!window.confirm("¿Eliminar este gasto fijo del mes?")) return;
    await eliminarGasto(sucursalId, id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Gastos fijos</h2>
          <p className="text-xs text-ink-soft">Total del mes: ${total.toLocaleString("es-AR")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarNuevo((v) => !v)}
            className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
          >
            {mostrarNuevo ? "Cancelar" : "+ Agregar tipo de gasto fijo"}
          </button>
          <button
            onClick={manejarGenerar}
            disabled={generando}
            className="rounded-lg bg-brass px-3 py-2 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {generando ? "Generando..." : "Generar mes"}
          </button>
        </div>
      </div>

      {mensaje && <p className="text-xs text-ink-soft">{mensaje}</p>}

      {mostrarNuevo && (
        <form
          onSubmit={manejarNuevoCatalogo}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Nombre
            </label>
            <input name="nombre" required className={CAMPO} placeholder="Ej: Alquiler" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Monto estimado
            </label>
            <input
              type="number"
              step="0.01"
              name="monto_estimado"
              className={CAMPO}
              placeholder="Opcional"
            />
          </div>
          {estado.error && <p className="text-xs text-red-400">{estado.error}</p>}
          <button
            type="submit"
            disabled={enviandoNuevo}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviandoNuevo ? "Guardando..." : "Agregar"}
          </button>
        </form>
      )}

      {catalogo.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Todavía no hay tipos de gasto fijo cargados. Agregá el primero arriba.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Monto este mes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {catalogo.map((c) => {
                const gasto = gastosPorCatalogoId.get(c.id);
                return (
                  <tr key={c.id} className="border-b border-edge last:border-0">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                      {c.nombre}
                    </td>
                    <td className="px-4 py-3">
                      {gasto ? (
                        <FilaMonto gasto={gasto} />
                      ) : (
                        <span className="text-xs text-ink-soft">
                          No generado — usá &quot;Generar mes&quot;
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {gasto && (
                        <button
                          onClick={() => manejarEliminar(gasto.id)}
                          className="text-xs text-red-400 underline decoration-red-400/40 underline-offset-2 hover:text-red-300"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
