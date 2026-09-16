"use client";

import { useActionState, useState } from "react";
import {
  editarRendicion,
  eliminarRendicion,
  type EditarRendicionEstado,
} from "@/app/sucursales/[id]/rendiciones/actions";
import type { Rendicion } from "@/lib/types";

type Props = {
  rendicion: Rendicion;
  url: string | null;
  sucursalId: string;
};

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

const ESTADO_INICIAL: EditarRendicionEstado = { error: null };

export function RendicionCard({ rendicion, url, sucursalId }: Props) {
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const accionEditar = editarRendicion.bind(null, rendicion.id, sucursalId);
  const [estado, formAction, guardando] = useActionState(accionEditar, ESTADO_INICIAL);

  async function manejarEliminar() {
    setEliminando(true);
    await eliminarRendicion(rendicion.id, sucursalId, rendicion.imagen_path);
    setEliminando(false);
  }

  if (editando) {
    return (
      <form
        action={(formData) => {
          formAction(formData);
          setEditando(false);
        }}
        className="space-y-2 overflow-hidden rounded-2xl border border-brass bg-card p-3"
      >
        <div>
          <label className={ETIQUETA}>Monto</label>
          <input
            type="number"
            step="0.01"
            name="monto"
            defaultValue={rendicion.monto ?? ""}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={ETIQUETA}>Descripción</label>
          <input
            type="text"
            name="descripcion"
            defaultValue={rendicion.descripcion ?? ""}
            className={CAMPO}
          />
        </div>
        <div>
          <label className={ETIQUETA}>Fecha</label>
          <input
            type="date"
            name="fecha"
            defaultValue={rendicion.fecha.slice(0, 10)}
            required
            className={CAMPO}
          />
        </div>
        {estado.error && <p className="text-xs text-red-700">{estado.error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 rounded-lg bg-brass px-2 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-lg border border-edge px-2 py-1.5 text-xs font-semibold text-ink-soft hover:border-brass hover:text-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-edge bg-card">
      {url && rendicion.imagen_path?.toLowerCase().endsWith(".pdf") ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-36 w-full flex-col items-center justify-center gap-1 bg-panel-deep text-brass"
        >
          <span className="font-display text-2xl font-semibold">PDF</span>
          <span className="text-xs text-ink-soft">Ver documento</span>
        </a>
      ) : url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={rendicion.descripcion ?? "Ticket de compra"}
            className="h-36 w-full object-cover"
          />
        </a>
      ) : (
        <div className="flex h-16 w-full items-center justify-center bg-panel-deep text-xs text-ink-soft">
          Cargada a mano — sin foto
        </div>
      )}

      <div className="p-3">
        <p className="text-sm font-medium text-ink">
          {rendicion.monto != null ? `$${rendicion.monto}` : "Sin monto"}
        </p>
        <p className="truncate text-xs text-ink-soft">{rendicion.descripcion ?? "—"}</p>
        <p className="mt-1 text-[0.65rem] text-ink-soft">
          {new Date(rendicion.fecha + "T00:00:00").toLocaleDateString("es-AR")}
        </p>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="flex-1 rounded-lg border border-edge px-2 py-1 text-[0.7rem] font-semibold text-ink-soft hover:border-brass hover:text-ink"
          >
            Editar
          </button>
          {confirmarBorrado ? (
            <button
              type="button"
              onClick={manejarEliminar}
              disabled={eliminando}
              className="flex-1 rounded-lg bg-red-700 px-2 py-1 text-[0.7rem] font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {eliminando ? "..." : "Confirmar"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="flex-1 rounded-lg border border-edge px-2 py-1 text-[0.7rem] font-semibold text-ink-soft hover:border-red-700 hover:text-red-700"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
