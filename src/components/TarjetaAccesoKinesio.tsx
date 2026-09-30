"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResidenteOpcion = { id: string; nombre: string; apellido: string };

type Props = {
  titulo: string;
  subtitulo: string;
  residentes: ResidenteOpcion[];
  destino: (residenteId: string) => string;
  color: "azul" | "ambar";
};

const ESTILOS = {
  azul: {
    tarjeta: "border-blue-300 bg-blue-50",
    titulo: "text-blue-900",
    boton: "bg-blue-700 hover:bg-blue-600",
  },
  ambar: {
    tarjeta: "border-amber-300 bg-amber-50",
    titulo: "text-amber-900",
    boton: "bg-amber-700 hover:bg-amber-600",
  },
} as const;

export function TarjetaAccesoKinesio({ titulo, subtitulo, residentes, destino, color }: Props) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState("");
  const estilo = ESTILOS[color];

  function ir() {
    if (!seleccionado) return;
    router.push(destino(seleccionado));
  }

  return (
    <div className={`rounded-2xl border-2 p-5 ${estilo.tarjeta}`}>
      <h2 className={`font-display text-base font-semibold ${estilo.titulo}`}>{titulo}</h2>
      <p className="mb-3 text-xs text-ink-soft">{subtitulo}</p>
      <div className="flex gap-2">
        <select
          value={seleccionado}
          onChange={(e) => setSeleccionado(e.target.value)}
          className="flex-1 rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">Elegir residente...</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={ir}
          disabled={!seleccionado}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 ${estilo.boton}`}
        >
          Ir
        </button>
      </div>
    </div>
  );
}
