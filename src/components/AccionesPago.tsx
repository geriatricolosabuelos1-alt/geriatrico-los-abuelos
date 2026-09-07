"use client";

import { useState } from "react";
import {
  eliminarPago,
  marcarPagado,
} from "@/app/residentes/[id]/cuenta-corriente/actions";

type Props = {
  residenteId: string;
  pagoId: string;
  estado: "pendiente" | "pagado";
};

export function AccionesPago({ residenteId, pagoId, estado }: Props) {
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);

  async function confirmarPago() {
    setEnviando(true);
    await marcarPagado(residenteId, pagoId, fecha);
    setEnviando(false);
    setMostrarFecha(false);
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

  if (mostrarFecha) {
    return (
      <div className="flex items-center justify-end gap-1.5">
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
      onClick={() => setMostrarFecha(true)}
      className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
    >
      Marcar pagado
    </button>
  );
}
