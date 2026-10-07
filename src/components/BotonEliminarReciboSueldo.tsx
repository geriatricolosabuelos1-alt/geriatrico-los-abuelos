"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarReciboSueldo } from "@/app/empleados/[id]/recibo/actions";

type Props = {
  empleadoId: string;
  periodo: string;
  // Texto que identifica el recibo en la confirmación, ej. "Florencia Pérez · Octubre 2026".
  etiqueta: string;
  // Si se indica, después de eliminar se navega ahí; si no, se refresca la pantalla.
  redirigirA?: string;
  className?: string;
};

export function BotonEliminarReciboSueldo({ empleadoId, periodo, etiqueta, redirigirA, className }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setEliminando(true);
    setError(null);
    const r = await eliminarReciboSueldo(empleadoId, periodo);
    setEliminando(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setAbierto(false);
    if (redirigirA) router.push(redirigirA);
    else router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setAbierto(true);
        }}
        className={className ?? "text-xs text-red-700 underline decoration-red-700/40 underline-offset-2 hover:text-red-500"}
      >
        Eliminar
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-edge bg-card p-6 text-left shadow-2xl">
            <p className="font-display text-lg font-semibold text-ink">¿Eliminar este recibo?</p>
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">{etiqueta}</span>. Se borra el recibo guardado y no se puede
              recuperar; si hace falta, se vuelve a generar desde cero.
            </p>
            {error && <p className="text-xs text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={eliminando}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-brass disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={eliminando}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
