"use client";

import { useActionState, useState } from "react";
import {
  crearRendicion,
  leerTicketConIA,
  type CrearRendicionEstado,
  type ItemLeido,
} from "@/app/sucursales/[id]/rendiciones/actions";
import type { CategoriaInsumo } from "@/lib/types";

type Props = {
  sucursalId: string;
};

type ItemRevision = ItemLeido & { incluido: boolean; clave: string };

const ESTADO_INICIAL: CrearRendicionEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

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
        })),
      );
      if (resultado.total !== null) {
        setMonto(String(resultado.total));
        setMontoDetectado(true);
      }
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
          ? { insumo_id: i.insumo_id, cantidad: i.cantidad }
          : { nombre: i.nombre, categoria: i.categoriaSugerida, cantidad: i.cantidad },
      ),
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
          className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-btn-ink`}
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
                  : "No se reconoció ningún producto en el ticket"}
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
                        className="w-16 rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink disabled:opacity-40"
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
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar rendición"}
        </button>
      </div>
    </form>
  );
}
