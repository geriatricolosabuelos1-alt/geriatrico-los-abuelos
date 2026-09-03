"use client";

import { useActionState, useState } from "react";
import { crearRendicion, type CrearRendicionEstado } from "@/app/sucursales/[id]/rendiciones/actions";
import { detectarItems, extraerTotal, type ItemDetectado } from "@/lib/ocrTickets";
import type { Insumo } from "@/lib/types";

type Props = {
  sucursalId: string;
  insumos: Insumo[];
};

type ItemRevision = ItemDetectado & { incluido: boolean };

const ESTADO_INICIAL: CrearRendicionEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

async function primeraPaginaComoCanvas(archivoPdf: File): Promise<HTMLCanvasElement> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await archivoPdf.arrayBuffer();
  const documento = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pagina = await documento.getPage(1);
  const viewport = pagina.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar el PDF.");

  await pagina.render({ canvas, canvasContext: contexto, viewport }).promise;
  return canvas;
}

export function RendicionForm({ sucursalId, insumos }: Props) {
  const accionConSucursal = crearRendicion.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  const [leyendo, setLeyendo] = useState(false);
  const [items, setItems] = useState<ItemRevision[]>([]);
  const [ocrIntentado, setOcrIntentado] = useState(false);
  const [monto, setMonto] = useState("");
  const [montoDetectado, setMontoDetectado] = useState(false);

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setLeyendo(true);
    setOcrIntentado(false);
    setItems([]);
    setMonto("");
    setMontoDetectado(false);

    try {
      const { recognize } = await import("tesseract.js");
      const fuenteOcr =
        archivo.type === "application/pdf" ? await primeraPaginaComoCanvas(archivo) : archivo;
      const { data } = await recognize(fuenteOcr, "spa");

      const detectados = detectarItems(data.text, insumos);
      setItems(detectados.map((d) => ({ ...d, incluido: true })));

      const total = extraerTotal(data.text);
      if (total !== null) {
        setMonto(String(total));
        setMontoDetectado(true);
      }
    } catch {
      setItems([]);
    } finally {
      setLeyendo(false);
      setOcrIntentado(true);
    }
  }

  function actualizarCantidad(insumoId: string, cantidad: number) {
    setItems((prev) =>
      prev.map((i) => (i.insumoId === insumoId ? { ...i, cantidad } : i)),
    );
  }

  function alternarIncluido(insumoId: string) {
    setItems((prev) =>
      prev.map((i) => (i.insumoId === insumoId ? { ...i, incluido: !i.incluido } : i)),
    );
  }

  const itemsParaEnviar = JSON.stringify(
    items
      .filter((i) => i.incluido)
      .map((i) => ({ insumo_id: i.insumoId, cantidad: i.cantidad })),
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
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {items.length > 0
              ? "Productos detectados — revisá antes de sumar al stock"
              : "No se reconoció ningún producto del catálogo en el ticket"}
          </p>
          {items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((i) => (
                <div key={i.insumoId} className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={i.incluido}
                    onChange={() => alternarIncluido(i.insumoId)}
                    className="h-4 w-4 accent-[var(--color-brass)]"
                  />
                  <span className={i.incluido ? "flex-1 text-ink" : "flex-1 text-ink-soft line-through"}>
                    {i.nombre}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={i.cantidad}
                    disabled={!i.incluido}
                    onChange={(e) => actualizarCantidad(i.insumoId, Number(e.target.value))}
                    className="w-20 rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink disabled:opacity-40"
                  />
                </div>
              ))}
            </div>
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
