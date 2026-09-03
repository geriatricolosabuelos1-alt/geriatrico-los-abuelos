"use client";

import { useActionState, useState } from "react";
import {
  crearRendicion,
  leerTicketConIA,
  type CrearRendicionEstado,
  type ItemLeido,
} from "@/app/sucursales/[id]/rendiciones/actions";

type Props = {
  sucursalId: string;
};

type ItemRevision = ItemLeido & { incluido: boolean };

const ESTADO_INICIAL: CrearRendicionEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

export function RendicionForm({ sucursalId }: Props) {
  const accionConSucursal = crearRendicion.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  const [leyendo, setLeyendo] = useState(false);
  const [items, setItems] = useState<ItemRevision[]>([]);
  const [ocrIntentado, setOcrIntentado] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [monto, setMonto] = useState("");
  const [montoDetectado, setMontoDetectado] = useState(false);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setOcrIntentado(false);
    setOcrError(null);
    setItems([]);
    setMonto("");
    setMontoDetectado(false);

    const datosArchivo = new FormData();
    datosArchivo.set("foto", archivo);

    const resultado = await leerTicketConIA(datosArchivo);

    if (resultado.error) {
      setOcrError(resultado.error);
    } else {
      setItems(resultado.items.map((i) => ({ ...i, incluido: true })));
      if (resultado.total !== null) {
        setMonto(String(resultado.total));
        setMontoDetectado(true);
      }
    }

    setLeyendo(false);
    setOcrIntentado(true);
  }

  function actualizarCantidad(insumoId: string, cantidad: number) {
    setItems((prev) =>
      prev.map((i) => (i.insumo_id === insumoId ? { ...i, cantidad } : i)),
    );
  }

  function alternarIncluido(insumoId: string) {
    setItems((prev) =>
      prev.map((i) => (i.insumo_id === insumoId ? { ...i, incluido: !i.incluido } : i)),
    );
  }

  const itemsParaEnviar = JSON.stringify(
    items
      .filter((i) => i.incluido)
      .map((i) => ({ insumo_id: i.insumo_id, cantidad: i.cantidad })),
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-3"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Nueva rendición
      </h2>

      <input type="hidden" name="items" value={itemsParaEnviar} />

      <div className="sm:col-span-3">
        <label className={ETIQUETA}>Foto o PDF del ticket</label>
        <input
          type="file"
          name="foto"
          accept="image/*,application/pdf"
          required
          onChange={manejarArchivo}
          className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-panel-deep`}
        />
        {leyendo && (
          <p className="mt-2 text-xs text-ink-soft">Leyendo el ticket, un momento...</p>
        )}
      </div>

      {ocrIntentado && !leyendo && (
        <div className="col-span-full rounded-lg border border-edge bg-panel-deep p-3">
          {ocrError ? (
            <p className="text-xs text-red-400">{ocrError}</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                {items.length > 0
                  ? "Productos detectados — revisá antes de sumar al stock"
                  : "No se reconoció ningún producto del catálogo en el ticket"}
              </p>
              {items.length > 0 && (
                <div className="space-y-1.5">
                  {items.map((i) => (
                    <div key={i.insumo_id} className="flex items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={i.incluido}
                        onChange={() => alternarIncluido(i.insumo_id)}
                        className="h-4 w-4 accent-[var(--color-brass)]"
                      />
                      <span
                        className={
                          i.incluido ? "flex-1 text-ink" : "flex-1 text-ink-soft line-through"
                        }
                      >
                        {i.nombre}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={i.cantidad}
                        disabled={!i.incluido}
                        onChange={(e) => actualizarCantidad(i.insumo_id, Number(e.target.value))}
                        className="w-20 rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink disabled:opacity-40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <label className={ETIQUETA}>
          Monto {montoDetectado && <span className="text-brass">(detectado)</span>}
        </label>
        <input
          type="number"
          step="0.01"
          name="monto"
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value);
            setMontoDetectado(false);
          }}
          className={CAMPO}
        />
      </div>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Descripción</label>
        <input
          type="text"
          name="descripcion"
          placeholder="Compra verdulería, carnicería..."
          className={CAMPO}
        />
      </div>

      {estado.error && (
        <p className="col-span-full text-sm text-red-400">{estado.error}</p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando || leyendo}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-panel-deep hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar rendición"}
        </button>
      </div>
    </form>
  );
}
