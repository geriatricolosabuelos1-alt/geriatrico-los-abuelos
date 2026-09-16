"use client";

import { useActionState, useState } from "react";
import {
  leerTicketConIA,
  registrarMovimientosPorTicket,
  type ItemLeido,
  type RegistrarPorTicketEstado,
} from "@/app/sucursales/[id]/inventario/actions";
import type { CategoriaInsumo } from "@/lib/types";

type Props = {
  sucursalId: string;
};

type ItemRevision = ItemLeido & { incluido: boolean; clave: string; precio: number | null };

const ESTADO_INICIAL: RegistrarPorTicketEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft";

const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

const ANCHO_MAXIMO = 1400;

async function comprimirImagen(archivo: File): Promise<File> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ANCHO_MAXIMO / bitmap.width);
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const contexto = canvas.getContext("2d");
  if (!contexto) return archivo;

  contexto.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.75),
  );
  if (!blob) return archivo;

  return new File([blob], archivo.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export function InventarioTicketForm({ sucursalId }: Props) {
  const accionConSucursal = registrarMovimientosPorTicket.bind(null, sucursalId);
  const [estado, formAction, guardando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  const [leyendo, setLeyendo] = useState(false);
  const [items, setItems] = useState<ItemRevision[]>([]);
  const [ocrIntentado, setOcrIntentado] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setOcrIntentado(false);
    setOcrError(null);
    setItems([]);
    setTotal(null);

    const archivoParaLeer =
      archivo.type === "application/pdf" ? archivo : await comprimirImagen(archivo);

    const datosArchivo = new FormData();
    datosArchivo.set("foto", archivoParaLeer);

    const resultado = await leerTicketConIA(datosArchivo);

    if (resultado.error) {
      setOcrError(resultado.error);
    } else {
      setItems(
        resultado.items.map((i, idx) => ({
          ...i,
          incluido: true,
          clave: i.insumo_id ?? `nuevo-${idx}`,
          precio: i.precioUnitario,
        })),
      );
      setTotal(resultado.total);
    }

    setLeyendo(false);
    setOcrIntentado(true);
  }

  function actualizarItem(clave: string, cambios: Partial<ItemRevision>) {
    setItems((prev) => prev.map((i) => (i.clave === clave ? { ...i, ...cambios } : i)));
  }

  const itemsParaEnviar = JSON.stringify(
    items
      .filter((i) => i.incluido)
      .map((i) =>
        i.insumo_id
          ? {
              insumo_id: i.insumo_id,
              nombre: i.nombre,
              categoria: i.categoriaSugerida,
              cantidad: i.cantidad,
              precio: i.precio,
            }
          : {
              nombre: i.nombre,
              categoria: i.categoriaSugerida,
              cantidad: i.cantidad,
              precio: i.precio,
            },
      ),
  );

  const hayItemsIncluidos = items.some((i) => i.incluido);

  return (
    <form
      action={(formData) => {
        formAction(formData);
        setItems([]);
        setOcrIntentado(false);
        setTotal(null);
      }}
      className="flex flex-col gap-4 rounded-2xl border border-edge bg-card p-5"
    >
      <h2 className="font-display text-sm font-semibold text-ink">Cargar por foto de ticket</h2>

      <input type="hidden" name="items" value={itemsParaEnviar} />

      <div>
        <label className={ETIQUETA}>Foto o PDF del ticket</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={manejarArchivo}
          className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-btn-ink`}
        />
        {leyendo && (
          <p className="mt-2 text-xs text-ink-soft">Leyendo el ticket, un momento...</p>
        )}
      </div>

      {ocrIntentado && !leyendo && (
        <div className="rounded-lg border border-edge bg-panel-deep p-3">
          {ocrError ? (
            <p className="text-xs text-red-700">{ocrError}</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
                {items.length > 0
                  ? "Productos detectados — revisá antes de sumar al stock"
                  : "No se reconoció ningún producto en el ticket"}
                {total !== null && ` · Total del ticket: $${total}`}
              </p>
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((i) => (
                    <div
                      key={i.clave}
                      className="flex flex-wrap items-center gap-2 border-b border-edge/60 pb-2 text-sm last:border-0 last:pb-0"
                    >
                      <input
                        type="checkbox"
                        checked={i.incluido}
                        onChange={() => actualizarItem(i.clave, { incluido: !i.incluido })}
                        className="h-4 w-4 accent-[var(--color-brass)]"
                      />

                      {i.insumo_id ? (
                        <span
                          className={
                            i.incluido ? "flex-1 text-ink" : "flex-1 text-ink-soft line-through"
                          }
                        >
                          {i.nombre}
                        </span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={i.nombre}
                            disabled={!i.incluido}
                            onChange={(e) => actualizarItem(i.clave, { nombre: e.target.value })}
                            className="flex-1 rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink disabled:opacity-40"
                          />
                          <select
                            value={i.categoriaSugerida}
                            disabled={!i.incluido}
                            onChange={(e) =>
                              actualizarItem(i.clave, {
                                categoriaSugerida: e.target.value as CategoriaInsumo,
                              })
                            }
                            className="rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink disabled:opacity-40"
                          >
                            {Object.entries(ETIQUETA_CATEGORIA).map(([valor, etiqueta]) => (
                              <option key={valor} value={valor}>
                                {etiqueta}
                              </option>
                            ))}
                          </select>
                          <span className="rounded-full bg-brass-soft px-2 py-0.5 text-[0.65rem] font-medium text-brass">
                            nuevo
                          </span>
                        </>
                      )}

                      <input
                        type="number"
                        min={1}
                        value={i.cantidad}
                        disabled={!i.incluido}
                        onChange={(e) =>
                          actualizarItem(i.clave, { cantidad: Number(e.target.value) })
                        }
                        title="Cantidad"
                        className="w-16 rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink disabled:opacity-40"
                      />

                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Precio"
                        value={i.precio ?? ""}
                        disabled={!i.incluido}
                        onChange={(e) =>
                          actualizarItem(i.clave, {
                            precio: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        title="Precio unitario"
                        className="w-20 rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink placeholder:text-ink-soft/60 disabled:opacity-40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}

      <div>
        <button
          type="submit"
          disabled={guardando || leyendo || !hayItemsIncluidos}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Sumar productos al stock"}
        </button>
      </div>
    </form>
  );
}
