"use client";

import { useState } from "react";
import {
  actualizarPago,
  eliminarPago,
  registrarPago,
} from "@/app/residentes/[id]/cuenta-corriente/actions";
import type { MetodoPago } from "@/lib/types";

type Props = {
  residenteId: string;
  pagoId: string;
  estado: "pendiente" | "parcial" | "pagado";
  monto: number;
  montoPagado: number;
  fechaPago: string | null;
  restante: number;
};

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "mercado_pago", etiqueta: "Mercado Pago" },
];

export function AccionesPago({
  residenteId,
  pagoId,
  estado,
  monto,
  montoPagado,
  fechaPago,
  restante,
}: Props) {
  const [modo, setModo] = useState<"ver" | "pagar" | "editar">("ver");
  const [nuevoMonto, setNuevoMonto] = useState(String(monto));
  const [nuevoPagado, setNuevoPagado] = useState(String(montoPagado));
  const [nuevaFecha, setNuevaFecha] = useState(
    fechaPago ?? new Date().toISOString().slice(0, 10),
  );
  const [montoAPagar, setMontoAPagar] = useState(String(restante));
  const [fechaPagoNueva, setFechaPagoNueva] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmarPago() {
    const montoNumero = Number(montoAPagar);
    if (!montoNumero || montoNumero <= 0) return;

    setEnviando(true);
    const formData = new FormData();
    formData.set("monto", montoAPagar);
    formData.set("fecha", fechaPagoNueva);
    formData.set("metodo_pago", metodoPago);
    await registrarPago(residenteId, pagoId, { error: null }, formData);
    setEnviando(false);
    setModo("ver");
  }

  async function confirmarEdicion() {
    setEnviando(true);
    setError(null);
    const formData = new FormData();
    formData.set("monto", nuevoMonto);
    formData.set("monto_pagado", nuevoPagado);
    formData.set("fecha_pago", nuevaFecha);
    const resultado = await actualizarPago(residenteId, pagoId, { error: null }, formData);
    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
    } else {
      setModo("ver");
    }
  }

  async function borrar() {
    if (!window.confirm("¿Eliminar este período de la cuenta corriente?")) return;
    await eliminarPago(residenteId, pagoId);
  }

  if (modo === "editar") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.65rem] text-ink-soft">Período</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={nuevoMonto}
            onChange={(e) => setNuevoMonto(e.target.value)}
            className="w-24 rounded-md border border-edge bg-panel-deep px-1.5 py-1 text-xs text-ink"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.65rem] text-ink-soft">Pagado</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={nuevoPagado}
            onChange={(e) => setNuevoPagado(e.target.value)}
            className="w-24 rounded-md border border-edge bg-panel-deep px-1.5 py-1 text-xs text-ink"
          />
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="rounded-md border border-edge bg-panel-deep px-1.5 py-1 text-xs text-ink"
          />
        </div>
        {error && <p className="text-[0.65rem] text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmarEdicion}
            disabled={enviando}
            className="text-xs font-medium text-brass hover:text-ink disabled:opacity-50"
          >
            {enviando ? "..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setModo("ver")}
            className="text-xs text-ink-soft hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (modo === "pagar") {
    return (
      <div className="flex flex-nowrap items-center justify-end gap-1">
        <input
          type="number"
          step="0.01"
          min="0"
          max={restante}
          value={montoAPagar}
          onChange={(e) => setMontoAPagar(e.target.value)}
          className="w-12 shrink-0 rounded-md border border-edge bg-panel-deep px-1 py-1 text-[11px] text-ink"
        />
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          className="w-[84px] shrink-0 rounded-md border border-edge bg-panel-deep px-1 py-1 text-[11px] text-ink"
        >
          {METODOS.map((m) => (
            <option key={m.valor} value={m.valor} style={{ backgroundColor: "var(--color-card)" }}>
              {m.etiqueta}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fechaPagoNueva}
          onChange={(e) => setFechaPagoNueva(e.target.value)}
          className="w-[108px] shrink-0 rounded-md border border-edge bg-panel-deep px-1 py-1 text-[11px] text-ink"
        />
        <button
          type="button"
          onClick={confirmarPago}
          disabled={enviando}
          className="shrink-0 text-xs font-medium text-brass hover:text-ink disabled:opacity-50"
        >
          {enviando ? "..." : "OK"}
        </button>
        <button
          type="button"
          onClick={() => setModo("ver")}
          className="text-xs text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <>
      {estado !== "pagado" && (
        <button
          type="button"
          onClick={() => setModo("pagar")}
          className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
        >
          {estado === "parcial" ? "Registrar pago" : "Marcar pagado"}
        </button>
      )}
      <button
        type="button"
        onClick={() => setModo("editar")}
        className="text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={borrar}
        className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
      >
        Eliminar
      </button>
    </>
  );
}
