"use client";

import { useMemo, useState } from "react";
import {
  agregarInsumosResidente,
  type InsumoMedicoConStock,
} from "@/app/sucursales/[id]/residentes/insumos-actions";

type Props = {
  sucursalId: string;
  residenteId: string;
  residenteNombre: string;
  insumos: InsumoMedicoConStock[];
};

type Seleccion = { cantidad: string; precio: string };

const FORMATO_MONEDA = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function AgregarInsumoResidente({
  sucursalId,
  residenteId,
  residenteNombre,
  insumos,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<Record<string, Seleccion>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function alternarInsumo(insumo: InsumoMedicoConStock, marcado: boolean) {
    setSeleccion((prev) => {
      const siguiente = { ...prev };
      if (marcado) {
        siguiente[insumo.id] = {
          cantidad: "1",
          precio: insumo.precio_referencia !== null ? String(insumo.precio_referencia) : "",
        };
      } else {
        delete siguiente[insumo.id];
      }
      return siguiente;
    });
  }

  function actualizarCampo(insumoId: string, campo: keyof Seleccion, valor: string) {
    setSeleccion((prev) => ({
      ...prev,
      [insumoId]: { ...prev[insumoId], [campo]: valor },
    }));
  }

  const total = useMemo(() => {
    return Object.values(seleccion).reduce((acc, s) => {
      const c = Number(s.cantidad) || 0;
      const p = Number(s.precio) || 0;
      return acc + c * p;
    }, 0);
  }, [seleccion]);

  const items = Object.entries(seleccion);

  async function confirmar() {
    setError(null);
    const payload = items
      .map(([insumo_id, s]) => ({
        insumo_id,
        cantidad: Number(s.cantidad) || 0,
        precio: Number(s.precio) || 0,
      }))
      .filter((i) => i.cantidad > 0 && i.precio > 0);

    if (payload.length === 0) {
      setError("Elegí al menos un insumo con cantidad y precio.");
      return;
    }

    setEnviando(true);
    const formData = new FormData();
    formData.set("items", JSON.stringify(payload));
    const resultado = await agregarInsumosResidente(
      sucursalId,
      residenteId,
      { error: null },
      formData,
    );
    setEnviando(false);

    if (resultado.error) {
      setError(resultado.error);
      return;
    }

    setSeleccion({});
    setAbierto(false);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
      >
        + Insumo
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-edge bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">
            Insumos médicos — {residenteNombre}
          </h2>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-sm text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {insumos.length === 0 && (
            <p className="text-sm text-ink-soft">No hay insumos médicos cargados en Inventario.</p>
          )}
          {insumos.map((insumo) => {
            const marcado = insumo.id in seleccion;
            return (
              <div
                key={insumo.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-panel-deep p-2.5"
              >
                <label className="flex flex-1 items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={(e) => alternarInsumo(insumo, e.target.checked)}
                  />
                  {insumo.nombre}
                  <span className="text-xs text-ink-soft">
                    (stock: {insumo.stock} {insumo.unidad})
                  </span>
                </label>
                {marcado && (
                  <>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={seleccion[insumo.id].cantidad}
                      onChange={(e) => actualizarCampo(insumo.id, "cantidad", e.target.value)}
                      className="w-16 rounded-lg border border-edge bg-panel px-2 py-1 text-sm text-ink focus:border-brass focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Precio"
                      value={seleccion[insumo.id].precio}
                      onChange={(e) => actualizarCampo(insumo.id, "precio", e.target.value)}
                      className="w-24 rounded-lg border border-edge bg-panel px-2 py-1 text-sm text-ink focus:border-brass focus:outline-none"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-edge pt-3">
          <p className="text-sm font-semibold text-ink">
            Total: {FORMATO_MONEDA.format(total)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando || items.length === 0}
              className="rounded-lg bg-brass px-4 py-2 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
            >
              {enviando ? "Guardando..." : "Registrar consumo"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
