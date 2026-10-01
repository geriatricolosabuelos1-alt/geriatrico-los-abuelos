"use client";

import { useState } from "react";

const EXT_IMAGEN = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];

// Muestra un archivo (PDF o imagen) en una ventana dentro del sistema, sin descargarlo.
export function VisorDocumento({ url, nombre, titulo }: { url: string; nombre: string; titulo: string }) {
  const [abierto, setAbierto] = useState(false);
  const extension = nombre.split(".").pop()?.toLowerCase() ?? "";
  const esImagen = EXT_IMAGEN.includes(extension);
  const esPdf = extension === "pdf";

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="text-xs text-brass hover:text-ink">
        Ver
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-edge bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{titulo}</p>
              <div className="flex flex-shrink-0 items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brass hover:text-ink"
                >
                  Abrir en otra pestaña
                </a>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="text-sm text-ink-soft hover:text-ink"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-panel-deep">
              {esImagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={titulo} className="mx-auto max-h-full max-w-full object-contain" />
              ) : esPdf ? (
                <iframe src={url} title={titulo} className="h-full w-full" />
              ) : (
                <p className="p-6 text-sm text-ink-soft">
                  Este tipo de archivo (.{extension}) no se puede mostrar acá. Usá &quot;Abrir en otra pestaña&quot;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
