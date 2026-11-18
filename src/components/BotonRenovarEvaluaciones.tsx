"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renovarEvaluacionesMes } from "@/app/residentes/[id]/accion-medica/evaluacion-actions";

// Al empezar el mes: pasa la última evaluación de cada residente al mes nuevo, pendiente de firma.
export function BotonRenovarEvaluaciones({ sedeId, cantidad, mes }: { sedeId: string; cantidad: number; mes: string }) {
  const router = useRouter();
  const [renovando, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (cantidad === 0 && !mensaje) return null;

  function renovar() {
    if (
      !window.confirm(
        `Se copia la última evaluación de ${cantidad} residente${cantidad === 1 ? "" : "s"} a ${mes}, con la medicación actual del kardex, y queda${cantidad === 1 ? "" : "n"} pendiente${cantidad === 1 ? "" : "s"} de firma. La médica después edita las que cambiaron y firma. ¿Seguimos?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await renovarEvaluacionesMes(sedeId);
      setMensaje(r.error ?? `Listo: ${r.renovadas} evaluaci${r.renovadas === 1 ? "ón quedó" : "ones quedaron"} pendientes de firma.`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-brass/40 bg-brass-soft p-4">
      {cantidad > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink">
            <span className="font-semibold">{cantidad}</span> residente{cantidad === 1 ? "" : "s"} con la evaluación de un mes
            anterior. Pasalas a {mes} para que la médica las revise y firme.
          </p>
          <button
            type="button"
            onClick={renovar}
            disabled={renovando}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {renovando ? "Renovando..." : `Renovar evaluaciones de ${mes}`}
          </button>
        </div>
      )}
      {mensaje && <p className="mt-2 text-sm text-ink">{mensaje}</p>}
    </div>
  );
}
