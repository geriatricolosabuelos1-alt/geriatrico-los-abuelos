"use client";

import { useState, useTransition } from "react";
import { registrarIngesta, registrarVasosAgua } from "@/app/sucursales/[id]/nutricion/actions";
import type { ComidaIngesta, RegistroIngesta } from "@/lib/types";

type Props = {
  sucursalId: string;
  residenteId: string;
  residenteNombre: string;
  fotoUrl: string | null;
  habitacion: string | null;
  registros: RegistroIngesta[];
};

const COMIDAS: { valor: ComidaIngesta; label: string }[] = [
  { valor: "desayuno", label: "Desayuno" },
  { valor: "almuerzo", label: "Almuerzo" },
  { valor: "merienda", label: "Merienda" },
  { valor: "cena", label: "Cena" },
];

const PORCENTAJES: (0 | 25 | 50 | 75 | 100)[] = [0, 25, 50, 75, 100];

export function IngestaResidente({
  sucursalId,
  residenteId,
  residenteNombre,
  fotoUrl,
  habitacion,
  registros,
}: Props) {
  const [comidaActiva, setComidaActiva] = useState<ComidaIngesta>("almuerzo");
  const [pendiente, startTransition] = useTransition();
  const registroActual = registros.find((r) => r.comida === comidaActiva);

  function marcar(porcentaje: 0 | 25 | 50 | 75 | 100) {
    startTransition(async () => {
      await registrarIngesta(sucursalId, residenteId, comidaActiva, porcentaje);
    });
  }

  function cambiarVasos(delta: number) {
    const actuales = registroActual?.vasos_agua ?? 0;
    const nuevo = Math.max(0, actuales + delta);
    startTransition(async () => {
      await registrarVasosAgua(sucursalId, residenteId, comidaActiva, nuevo);
    });
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-edge bg-panel-deep">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm text-ink-soft">
              {residenteNombre.charAt(0)}
            </span>
          )}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{residenteNombre}</p>
          {habitacion && <p className="text-xs text-ink-soft">Hab. {habitacion}</p>}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {COMIDAS.map((c) => {
          const registrado = registros.some((r) => r.comida === c.valor);
          return (
            <button
              key={c.valor}
              type="button"
              onClick={() => setComidaActiva(c.valor)}
              className={`rounded-full px-2.5 py-1 text-[0.65rem] font-medium ${
                comidaActiva === c.valor
                  ? "bg-brass text-btn-ink"
                  : registrado
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-panel-deep text-ink-soft"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mb-2 grid grid-cols-5 gap-1">
        {PORCENTAJES.map((p) => (
          <button
            key={p}
            type="button"
            disabled={pendiente}
            onClick={() => marcar(p)}
            className={`rounded-lg border py-3 text-xs font-semibold disabled:opacity-50 ${
              registroActual?.porcentaje === p
                ? "border-brass bg-brass text-btn-ink"
                : "border-edge bg-panel-deep text-ink-soft hover:border-brass"
            }`}
          >
            {p}%
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-soft">Agua ({comidaActiva})</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cambiarVasos(-1)}
            disabled={pendiente}
            className="h-6 w-6 rounded-full border border-edge text-ink-soft hover:border-brass disabled:opacity-50"
          >
            −
          </button>
          <span className="text-sm text-ink">{registroActual?.vasos_agua ?? 0} vasos</span>
          <button
            type="button"
            onClick={() => cambiarVasos(1)}
            disabled={pendiente}
            className="h-6 w-6 rounded-full border border-edge text-ink-soft hover:border-brass disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}
