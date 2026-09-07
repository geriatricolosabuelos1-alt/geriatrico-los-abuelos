"use client";

import { useState } from "react";
import {
  eliminarPago,
  registrarPago,
} from "@/app/residentes/[id]/cuenta-corriente/actions";
import type { MetodoPago } from "@/lib/types";

type Props = {
  residenteId: string;
  pagoId: string;
  estado: "pendiente" | "parcial" | "pagado";
  restante: number;
};

const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "mercado_pago", etiqueta: "Mercado Pago" },
];

export function AccionesPago({ residenteId, pagoId, estado, restante }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [monto, setMonto] = useState(String(restante));
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [enviando, setEnviando] = useState(false);

  async function confirmarPago() {
    const montoNumero = Number(monto);
    if (!montoNumero || montoNumero <= 0) return;

    setEnviando(true);
    const formData = new FormData();
    formData.set("monto", monto);
    formData.set("fecha", fecha);
    formData.set("metodo_pago", metodoPago);
    await registrarPago(residenteId, pagoId, { error: null }, formData);
    setEnviando(false);
    setMostrarForm(false);
  }

  async function borrar() {
    if (!window.confirm("¿Eliminar este registro de pago?")) return;
    await eliminarPago(residenteId, pagoId);
  }

  if (estado === "pagado") {
    return (
      <button
        type="button"
        onClick={borrar}
        className="text-xs text-red-400 underline decoration-red-400/40 underline-offset-2 hover:text-red-300"
      >
        Eliminar
      </button>
    );
  }

  if (mostrarForm) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <input
          type="number"
          step="0.01"
          min="0"
          max={restante}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-20 rounded-md border border-edge bg-panel-deep px-1.5 py-1 text-xs text-ink"
        />
        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          className="rounded-md border border-edge bg-panel-deep px-1.5 py-1 text-xs text-ink"
        >
          {METODOS.map((m) => (
            <option key={m.valor} value={m.valor} style={{ backgroundColor: "#0b0a14" }}>
              {m.etiqueta}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-md border border-edge bg-panel-deep px-1.5 py-1 text-xs text-ink"
        />
        <button
          type="button"
          onClick={confirmarPago}
          disabled={enviando}
          className="text-xs font-medium text-brass hover:text-ink disabled:opacity-50"
        >
          {enviando ? "..." : "OK"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setMostrarForm(true)}
      className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
    >
      {estado === "parcial" ? "Registrar pago" : "Marcar pagado"}
    </button>
  );
}
